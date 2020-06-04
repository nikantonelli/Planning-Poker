
Ext.define('Niks.Apps.PokerGameConfig', {
    extend: Niks.Apps.Panel,
    id: mainConfigName+'Panel',
    /** Each interation might have different config
    iterationConfig: {}, 
    */
   /**
    mainConfig: {
        activeStory: null,
        moderatorID: null,
        allowIterationSelector: false,
    },
     */
    /** 
    userConfig: {}, //Contains 'active' as well as other layout info for this game 
     */

    userIDs: [],            /** Only contains the reference to the user only so that we can get info from UserConfig */
    moderatorUser: null,    /** Full object for the moderator */
    models: [],

    setModels: function(models) {
        this.models = models;
        this[mainConfigName].artefactTypes = _.map(models, function(model) {
            return model.typePath;
        });
//        this.app.fireEvent(configSave);
    },

    /** We know of three config types right now: MainConfig, IterationConfig, UserConfig */
    initialiseConfig: function(fieldText) {
        this._preInitialiseDefaults();
        Ext.apply(this[mainConfigName],this._decodeConfig(mainConfigName, fieldText));
        Ext.apply(this[userConfigName], this._decodeConfig(userConfigName, fieldText));
        Ext.apply(this[iterConfigName], this._decodeConfig(iterConfigName, fieldText));
        this._postInitialiseDefaults();
    },

    _preInitialiseDefaults: function() {
        if (!this[mainConfigName]) { this[mainConfigName] = {};}
        if (!this[userConfigName]) { this[userConfigName] = {};}
        if (!this[iterConfigName]) { this[iterConfigName] = {};}
        this[mainConfigName].votingTime = votingTime;
        this[mainConfigName].planningType =  defaultPlanningType;
        this[mainConfigName].extraUsers = [];
        this[mainConfigName].extraArtefacts = [];
    },

    _postInitialiseDefaults: function() {
        this[mainConfigName].artefactTypes = (this[mainConfigName].artefactTypes && this[mainConfigName].artefactTypes.length) ? this[mainConfigName].artefactTypes :
                ((this[mainConfigName].planningType === piPlanningType) ? ['portfolioitem/feature']  : //Guess at 'Feature' for now
                                                                ['hierarchicalrequirement', 'defect', 'testcase', 'testset', 'defectsuite']);    
    },

    getNamedConfig: function(name) {
        return this[name] || {};
    },

    //Send in an object 
    updateNamedConfig: function(name, config) {
        this[name] = config;
    },

    _decodeConfig: function(requiredType, fieldText) {

        if ((fieldText === undefined) || ( fieldText.length === 0)) {
            return {};
        }
        var msgs = fieldText.split(configSplitter1);
        var configs = {};
        _.each(msgs, function(msg) {
            var splitMsg = msg.split(configSplitter2);
            if (splitMsg[0].length) {
                configs[splitMsg[0]] = splitMsg[1];
            }
        });
        return JSON.parse(configs[requiredType] || "{}");
    },

    addStory: function(story) {   //Passed in a user record
        if ( _.find(  this[mainConfigName].extraArtefacts, function(existing) {
                return existing.storyOID === story.get(storyIdField);
            })
            ) {
                console.log("Adding existing story - ignoring!");
            
        } else {
            this[mainConfigName].extraArtefacts.push({
                storyOID: story.get(storyIdField),
                storyFID: story.get('FormattedID'),
                storyName: story.get('Name')
            });
            this._updateCurrentStoryList();
        }
    },
    
    delStory: function( story) {
        var storedStory = _.find( this[mainConfigName].extraArtefacts, {storyOID: story.get(storyIdField)});
        if ( !storedStory) {
            console.log("Removing non-existent story - ignoring!");
        } else {
            this[mainConfigName].extraArtefacts = _.without(this[mainConfigName].extraArtefacts, storedStory);
            this._updateCurrentStoryList();
        }
        
    },
    addUser: function(user) {   //Passed in a user record
        if ( _.find( this.userIDs, {userOID: user.get(userIdField)})) {
            console.log("Adding existing member - ignoring!");
        } else {
            this.userIDs.push({ 
                userOID: user.get(userIdField),
                displayName: user.get('_refObjectName')
            });
        }
    },

    addExtraUser: function( user) {
        var extraUser = _.find( this[mainConfigName].extraUsers, {userOID: user.get(userIdField)});
        var teamUser = _.find( this.userIDs, {userOID: user.get(userIdField)});

        if ( extraUser ) {
            console.log("Adding existing user - ignoring!");
            return false;
        }

        if (teamUser) {
            console.log("Adding existing team member - ignoring!");
            return false;
        }

        this[mainConfigName].extraUsers.push({ 
            userOID: user.get(userIdField),
            displayName: user.get('_refObjectName')
        });
        this._updateCurrentUserList();
        return true;

    },

    removeExtraUser: function( user) {

        var storedUser = _.find( this[mainConfigName].extraUsers, {userOID: user.get(userIdField)});
        if ( storedUser === undefined) {
            console.log("Removing non-existent member - ignoring!");
            return false;
        }

        this[mainConfigName].extraUsers = _.without(this[mainConfigName].extraUsers, storedUser);
        this._updateCurrentUserList();
        return true;
        
    },

    getModerator: function() {
        if (this.moderatorUser) {
            return this.moderatorUser;
        }
        else {
            return null;   //Be specific about a null.
        }
    },

    setModerator: function(user) {
        console.log('mod set to:',user);
        this[mainConfigName].moderatorID = user.get(userIdField);
        this.moderatorUser = user;
    },

    setModeratorFromId: function(id) {
        var me = this;
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store', {
            model: 'User',
            autoLoad: true,
            filters: [
                {
                    property: userIdField,
                    value: id
                }
            ],
            listeners: {
                load: function(store, records, success) {
                    if (success) {
                        me.setModerator(records[0]);
                        deferred.resolve(records[0]);
                    }
                    else {
                        deferred.reject();
                    }
                },
                scope: me
            }
        });
        return deferred.promise;
    },

    getConfigValue: function(fieldName) {
        return this[mainConfigName][fieldName];
    },

    //Here be dragons....
    setConfigValue: function(fieldName, value) {
        this[mainConfigName][fieldName] = value;
    },

    _encodeMsg: function(msgType, msgText) {
        return configSplitter1 + msgType + configSplitter2 + msgText;
//        return configSplitter + msgType + "," + window.btoa(msgText);
    },

    _decodeMsg: function(msgType, msgText) {
        return msgText.split(configSplitter2).pop();
    },

    /* Gameconfig is the thing that is stored to the Project field. Must not be more than 32768 chars */
    getGameConfig: function() {
        return  this._encodeMsg(mainConfigName, JSON.stringify(this[mainConfigName])) +
                this._encodeMsg(userConfigName, JSON.stringify(this[userConfigName]))+
                this._encodeMsg(iterConfigName, JSON.stringify(this[iterConfigName]));
    },

    _getCurrentUserList: function() {
        var text = '';
        _.each (this.getConfigValue('extraUsers'), function (user) {
            text += user.displayName+", ";
        });
        return text;
    },

    _getCurrentStoryList: function() {
        var text = '';
        _.each (this.getConfigValue('extraArtefacts'), function (story) {
            text += story.storyFID+", ";
        });
        return text;
    },

    _updateCurrentUserList: function() {
        this.getPanel().down('#extrauserlist').setValue(this._getCurrentUserList());
        this.app.fireEvent(configChange);
    },
    _updateCurrentStoryList: function() {
        this.getPanel().down('#extrastorylist').setValue(this._getCurrentStoryList());
        this.app.fireEvent(configChange);
    },

    _createPanel: function() {
        var me = this;
        Ext.suspendLayouts();
        var panel = Ext.create('Ext.panel.Panel', {
//        var panel = Ext.create('Ext.container.Container', {
            floating: true,
            draggable: true,
            width: 540,
            baseCls: 'configPanel',
            hidden: true,
            closable: true,
            closeAction: 'hide',
        });
        panel.add( {
            xtype: 'container',
            layout: 'vbox',
            style: {
                border: 'none'
            },
            margin: '5 0 5 20',
            items: [
                {
                    xtype: 'text',
                    text: 'Game Settings:',
                    cls: 'configPanelTitle'
                },
                {
                    xtype: 'field',
                    id: 'curMod',
                    fieldLabel: 'Current Moderator',
                    labelWidth: 180,
                    width: 460,
                    margin: '10 0 5 20',
                    baseBodyCls: 'textfield',
                    readOnly: true,
                    value: me.moderatorUser? me.moderatorUser.get('UserName'): 'Not Set'

                },
                {
                    xtype: 'rallyusercombobox',
                    id: 'modChooser',
                    fieldLabel: 'Change Moderator To',
                    valueField: userIdField,
                    labelWidth: 180,
                    width: 460,
                    margin: '0 0 5 20',
                    autoSelect: false,
                    listeners: {
                        //Setvalue fires when the thing is first set up with a null value.
                        select: function(entry) {
                            if (entry.value !== null) {
                                me.setModerator(entry.lastSelection[0]);
                                panel.down('#curMod').setValue(me.moderatorUser.get('UserName'));
                                Ext.create('Rally.ui.dialog.ConfirmDialog', {
                                        title: "New Moderator",
                                        message: "Restart session?",
                                        listeners: {
                                            confirm: function() {
                                                //Set user up as moderator
                                                me.app.fireEvent(configChange);
                                                me.hidePanel();
                                            }
                                        }
                                    }
                                );
                            }
                        },
                    }
                },
                {
                    xtype: 'rallycheckboxfield',
                    fieldLabel: "Enable Iteration Selector",
                    id: 'allowIterationSelector',
                    value: me[mainConfigName].allowIterationSelector,
                    labelWidth: 180,
                    margin: '0 0 5 20',
                    hidden: me.getConfigValue('planningType') !== teamPlanningType,
                    hideMode: 'visibility',
                    listeners: {
                        change: function( tickbox, newV, oldV, opts) {
                            me[mainConfigName].allowIterationSelector = newV;
                            me.app.fireEvent(configChange);
                        }
                    }
                },
                {
                    xtype: 'rallycheckboxfield',
                    fieldLabel: "Use T-Shirt sizing",
                    id: 'useTShirt',
                    value: me[mainConfigName].useTShirt,
                    labelWidth: 180,
                    margin: '0 0 5 20',
                    listeners: {
                        change: function( tickbox, newV, oldV, opts) {
                            me[mainConfigName].useTShirt = newV;                   
                            me[userConfigName].useTShirt = newV;
                            me.app.fireEvent(configChange);
                        }
                    }
                },
                {
                    xtype: 'textfield',
                    baseCls: 'timerText',
                    fieldLabel: 'Voting Time (min:sec)',
                    labelWidth: 180,
                    margin: '0 0 5 20',
                    value: me[mainConfigName].votingTime  || votingTime,
                    validator: function(value) {
                        if (Ext.Date.parse(value, "i:s") !== undefined) {
                            me[mainConfigName].votingTime = value;
                            me.app.fireEvent(configSave);   //Save but don't change this game
                            return true;
                        }
                        return false;
                    }
                }
            ]            
        });

        panel.add( {
            xtype: 'container',
            layout: 'vbox',
            margin: '5 0 5 20',
            items: [
                {
                    xtype: 'text',
                    text: 'Artefact Filtering:',
                    cls: 'configPanelTitle'
                },
                                {
                    xtype: 'fieldcontainer',
                    margin: '0 20 0 20',
                    layout: 'hbox',
                    defaults: {
                        flex: 1
                    },
                    items: [
                        {
                            xtype: 'radiofield',
                            fieldLabel: '',
                            boxLabel  : 'Portfolio Planning',
                            name      : 'planningType',
                            inputValue: piPlanningType,
                            checked: me.getConfigValue('planningType') === piPlanningType,
                            id        : 'typePortfolio',
                            width: 150,
                            handler: function(box, newV, oldV) {
                                if (newV === false) {
                                    me.setConfigValue('planningType', Ext.getCmp('typeTeam').inputValue);
                                    Ext.getCmp('teamTypesSelection').setVisible(true);
                                } else {
                                    me.setConfigValue('planningType', box.inputValue);
                                    Ext.getCmp('teamTypesSelection').setVisible(false);
                                }
                                me.setConfigValue('artefactTypes',[]); 
                                me._postInitialiseDefaults();   //Gives us all the artefact types, so renable the selectors next
                                me.getPanel().down('#selectStories').setValue(true);
                                me.getPanel().down('#selectDefects').setValue(true);
                                me.getPanel().down('#selectTestCases').setValue(true);
                                me.getPanel().down('#selectTestSets').setValue(true);
                                me.getPanel().down('#selectDefectSuites').setValue(true);
                                me.app.fireEvent(configChange);
                            },
                        }, {
                            xtype: 'radiofield',
                            fieldLabel: '',
                            name      : 'planningType',
                            boxLabel  : 'Team Planning',
                            inputValue: teamPlanningType,
                            checked: me.getConfigValue('planningType') === teamPlanningType,
                            id        : 'typeTeam',
                            width: 150,
                        }
                    ]

                },{
                    xtype: 'container',
                    id: 'teamTypesSelection',
                    hidden: me.getConfigValue('planningType') !== teamPlanningType,
                    hideMode: 'visibility',
                    layout: 'hbox',
                    items: [
                        {
                            xtype: 'rallycheckboxfield',
                            itemId: 'selectStories',
                            fieldLabel: 'Stories',
                            labelWidth: 80,
                            labelAlign: 'right',
                            listeners: {
                                change: function(item, setting) {
                                    if (!setting) {
                                        me[mainConfigName].artefactTypes = _.without(me[mainConfigName].artefactTypes, 'hierarchicalrequirement');
                                        if ( me[mainConfigName].artefactTypes.length === 0 ){
                                            me.getPanel().down('#selectDefects').setValue(true);
                                        }
                                    }
                                    else {
                                        me[mainConfigName].artefactTypes = _.union(me[mainConfigName].artefactTypes, ['hierarchicalrequirement']);
                                    }
                                    me.app.fireEvent(configChange);

                                }
                            },
                            value: _.indexOf(me[mainConfigName].artefactTypes, 'hierarchicalrequirement') >= 0
                        },
                        {
                            xtype: 'rallycheckboxfield',
                            fieldLabel: 'Defects',
                            labelWidth: 80,
                            labelAlign: 'right',
                            itemId: 'selectDefects',
                            margin: 0,
                            listeners: {
                                change: function(item, setting) {
                                    if (!setting) {
                                        me[mainConfigName].artefactTypes = _.without(me[mainConfigName].artefactTypes, 'defect');
                                        if (  me[mainConfigName].artefactTypes.length === 0 ){
                                            me.getPanel().down('#selectStories').setValue(true);
                                        }

                                    }
                                    else {
                                        me[mainConfigName].artefactTypes = _.union(me[mainConfigName].artefactTypes, ['defect']);
                                    }
                                    me.app.fireEvent(configChange);
                                }
                            },
                            value: _.indexOf(me[mainConfigName].artefactTypes, 'defect') >= 0

                        },
                        {
                            xtype: 'rallycheckboxfield',
                            fieldLabel: 'TestCases',
                            labelWidth: 80,
                            labelAlign: 'right',
                            itemId: 'selectTestCases',
                            margin: 0,
                            listeners: {
                                change: function(item, setting) {
                                    if (!setting) {
                                        me[mainConfigName].artefactTypes = _.without(me[mainConfigName].artefactTypes, 'testcase');
                                        if (  me[mainConfigName].artefactTypes.length === 0 ){
                                            me.getPanel().down('#selectStories').setValue(true);
                                        }

                                    }
                                    else {
                                        me[mainConfigName].artefactTypes = _.union(me[mainConfigName].artefactTypes, ['testcase']);
                                    }
                                    me.app.fireEvent(configChange);
                                }
                            },
                            value: _.indexOf(me[mainConfigName].artefactTypes, 'testcase') >= 0

                        },
                        {
                            xtype: 'rallycheckboxfield',
                            fieldLabel: 'Test Sets',
                            labelWidth: 80,
                            labelAlign: 'right',
                            itemId: 'selectTestSets',
                            margin: 0,
                            listeners: {
                                change: function(item, setting) {
                                    if (!setting) {
                                        me[mainConfigName].artefactTypes = _.without(me[mainConfigName].artefactTypes, 'testset');
                                        if (  me[mainConfigName].artefactTypes.length === 0 ){
                                            me.getPanel().down('#selectStories').setValue(true);
                                        }

                                    }
                                    else {
                                        me[mainConfigName].artefactTypes = _.union(me[mainConfigName].artefactTypes, ['testset']);
                                    }
                                    me.app.fireEvent(configChange);
                                }
                            },
                            value: _.indexOf(me[mainConfigName].artefactTypes, 'testset') >= 0

                        },
                        {
                            xtype: 'rallycheckboxfield',
                            fieldLabel: 'Defect Suites',
                            labelWidth: 80,
                            labelAlign: 'right',
                            itemId: 'selectDefectSuites',
                            margin: 0,
                            listeners: {
                                change: function(item, setting) {
                                    if (!setting) {
                                        me[mainConfigName].artefactTypes = _.without(me[mainConfigName].artefactTypes, 'defectsuite');
                                        if (  me[mainConfigName].artefactTypes.length === 0 ){
                                            me.getPanel().down('#selectStories').setValue(true);
                                        }

                                    }
                                    else {
                                        me[mainConfigName].artefactTypes = _.union(me[mainConfigName].artefactTypes, ['defectsuite']);
                                    }
                                    me.app.fireEvent(configChange);
                                }
                            },
                            value: _.indexOf(me[mainConfigName].artefactTypes, 'defectsuite') >= 0

                        }
                    ]
                },
                {
                    xtype: 'textarea',
                    fieldLabel: 'Query Filter',
                    name: 'query',
                    cls: 'query-field',
                    labelAlign: 'top',
                    width: 460,
                    value: me[mainConfigName].storyFilter,
                    margin: '0 20 5 20',
                    validateOnBlur: true,
                    validateOnChange: false,
                    validator: function(value) {
                        try {
                            if (value) {
                                Rally.data.wsapi.Filter.fromQueryString(value);
                            }
                            me[mainConfigName].storyFilter = value;
                            me.app.fireEvent(configChange);
                            return true;
                        } catch (e) {
                            return e.message;
                        }
                    }      
                }
            ]  
        });

        panel.add ( {
            xtype: 'container',
            layout: 'vbox',
            width: '100%',
            margin: '5 0 5 20',

            items: [
                {
                    xtype: 'text',
                    text: 'Additional Voters:',
                    cls: 'configPanelTitle'
                },
                {
                    xtype: 'container',
            
                    layout: 'hbox',
                    items: [
                        
                        {
                            fieldLabel: 'Choose',
                            margin: '5 0 5 20',
                            labelWidth: 40,
                            width: 300,
                            xtype: 'rallyusersearchcombobox',
                            itemId: 'usersearchbox',
                            storeConfig: {
                                fetch: ['_ref', '_refObjectName', userIdField, 'UserName', 'DisplayName']
                            },
                            listeners: {
                                select: function(selector, user) {
                                    panel.down('#addUserButton').enable();
                                    panel.down('#delUserButton').enable();
                                }
                            }
                        },
                        {
                            xtype: 'rallybutton',
                            text: 'Add',
                            itemId: 'addUserButton',
                            disabled: true,
                            width: 70,
                            margin: 5,
                            handler: function() {
                                me.app.fireEvent('adduser', panel.down('#usersearchbox').getRecord());
                            }
                        },
                        {
                            xtype: 'rallybutton',
                            text: 'Remove',
                            itemId: 'delUserButton',
                            width: 70,
                            disabled: true,
                            margin: '5 0 5 0',
                            handler: function() {
                                me.app.fireEvent('removeuser', panel.down('#usersearchbox').getRecord());
                            }
                        }
                    ]
                },
                {
                    xtype: 'textarea',
                    fieldLabel: 'Additional User List',
                    itemId: 'extrauserlist',
                    labelAlign: 'top',
                    width: 460,
                    value: me._getCurrentUserList(),
                    margin: '0 0 5 20',
                    readOnly: true   
                }
            ]
        });

        panel.add( {
            xtype: 'container',
            layout: 'vbox',
            width: '100%',
            margin: '5 0 5 18',
            items: [
                {
                    xtype: 'text',
                    text: 'Priority Artefacts:',
                    cls: 'configPanelTitle'
                },
                {
                    xtype: 'container',
                    layout: 'hbox',
                    items: [
                        {
                            margin: '5 0 5 20',
                            fieldLabel: 'Choose',
                            labelWidth: 40,
                            width: 300,
                            xtype: 'rallyartifactsearchcombobox',
                            itemId: 'searchbox',
                            storeConfig: {
                                models: me.models,
                                fetch: true
                            },
                            listeners: {
                                select: function(selector, artefact) {
                                    panel.down('#addAtftButton').enable();
                                    panel.down('#delAtftButton').enable();
                                }
                            }
                        },
                        {
                            xtype: 'rallybutton',
                            text: 'Add',
                            itemId: 'addAtftButton',
                            disabled: true,
                            width: 70,
                            margin: 5,
                            handler: function() {
                                me.app.fireEvent('addartefact', panel.down('#searchbox').getRecord());
                            }
                        },
                        {
                            xtype: 'rallybutton',
                            text: 'Remove',
                            itemId: 'delAtftButton',
                            width: 70,
                            disabled: true,
                            margin: '5 0 5 0',
                            handler: function() {
                                me.app.fireEvent('removeartefact', panel.down('#searchbox').getRecord());
                            }
                        }
                    ]
                },{
                    xtype: 'rallyaddnew',
                    margin: '5 0 5 20',
                    recordTypes: ['User Story', 'Defect'],
                    ignoredRequiredFields: ['Name', 'ScheduleState', 'Project', 'Owner', 'FlowState'],
                    listeners: {
                        create: function(addnew, record) {
                            Rally.ui.notify.Notifier.show(Ext.String.format('Added {0}: {1}',
                                record.get('FormattedID'),
                                record.get('Name')
                            ));
                            me.app.fireEvent('refresh');
                        }
                    }
                },{
                    xtype: 'textarea',
                    fieldLabel: 'Additional Artefact List',
                    itemId: 'extrastorylist',
                    labelAlign: 'top',
                    width: 460,
                    value: me._getCurrentStoryList(),
                    margin: '5 0 5 20',
                    readOnly: true   
                }
            ]
        });
        Ext.resumeLayouts(true);
        this.configPanel = panel;
        return panel;
    },
});