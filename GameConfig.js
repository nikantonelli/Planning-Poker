
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

    /** We know of three config types right now: MainConfig, IterationConfig, UserConfig */
    initialiseConfig: function(fieldText) {
        this[mainConfigName] = this._decodeConfig(mainConfigName, fieldText);
        this[userConfigName] = this._decodeConfig(userConfigName, fieldText);
        this[iterConfigName] = this._decodeConfig(iterConfigName, fieldText);
        if (!this[mainConfigName].votingTime) {
            this[mainConfigName].votingTime = votingTime;
        }
        
        if ((!this[mainConfigName].artefactTypes) || !this[mainConfigName].artefactTypes.length){
            this[mainConfigName].artefactTypes = ['UserStory', 'Defect'];
        }
        this[mainConfigName].extraUsers = this[mainConfigName].extraUsers || [];
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

    addUser: function(user) {   //Passed in a user record
        if ( _.find( this.userIDs, {userOID: user.get(userIdField)})) {
            console.log("Adding existing member - ignoring!");
        } else {
            this.userIDs.push(user[userIdField]);
        }
    },

    addExtraUser: function( user) {

        if ( _.find( this[mainConfigName].extraUsers, {userOID: user.get(userIdField)})) {
            console.log("Adding existing member - ignoring!");
        } else {
            this[mainConfigName].extraUsers.push({ 
                userOID: user.get(userIdField),
                displayName: user.get('_refObjectName')
            });
        }
        this._updateCurrentUserList();
    },

    removeExtraUser: function( user) {
        storedUser = _.find( this[mainConfigName].extraUsers, {userOID: user.get(userIdField)});
        if ( !storedUser) {
            console.log("Removing non-existent member - ignoring!");
        } else {
            this[mainConfigName].extraUsers = _.without(this[mainConfigName].extraUsers, storedUser);
        }
        this._updateCurrentUserList();
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
                }
            }
        });
        return deferred.promise;
    },

    getConfigValue: function(fieldName) {
        return this[mainConfigName][fieldName];
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
            text += user.displayName+",";
        });
        return text;
    },

    _updateCurrentUserList: function() {
        this.getPanel().down('#extrauserlist').setValue(this._getCurrentUserList());
        this.app.fireEvent(configChange);
    },

    _createPanel: function() {
        var me = this;
        var panel = Ext.create('Ext.panel.Panel', {
//        var panel = Ext.create('Ext.container.Container', {
            floating: true,
            draggable: true,
            width: 500,
            height: 400,
            baseCls: 'configPanel',
            hidden: true,
            closable: true,
            closeAction: 'hide',
        });
        panel.add( {
            xtype: 'field',
            id: 'curMod',
            fieldLabel: 'Current Moderator',
            labelWidth: 180,
            width: 460,
            margin: '10 0 5 20',
            baseBodyCls: 'textfield',
            readOnly: true,
            value: me.moderatorUser? me.moderatorUser.get('UserName'): 'Not Set'

        });
        panel.add( {
            xtype: 'rallyusercombobox',
            id: 'modChooser',
            fieldLabel: 'Change Moderator To',
            valueField: userIdField,
            labelWidth: 180,
            width: 460,
            margin: '5 0 5 20',
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
        });

        panel.add( {
            xtype: 'rallycheckboxfield',
            fieldLabel: "Enable Iteration Selector",
            id: 'allowIterationSelector',
            value: me[mainConfigName].allowIterationSelector,
            labelWidth: 180,
            margin: '5 0 0 20',
            listeners: {
                change: function( tickbox, newV, oldV, opts) {
                    me[mainConfigName].allowIterationSelector = newV;
                    me.app.fireEvent(configChange);
                }
            }
        });

        panel.add( {
            xtype: 'rallycheckboxfield',
            fieldLabel: "Use T-Shirt sizing",
            id: 'useTShirt',
            value: me[mainConfigName].useTShirt,
            labelWidth: 180,
            margin: '5 0 0 20',
            listeners: {
                change: function( tickbox, newV, oldV, opts) {
                    me[mainConfigName].useTShirt = newV;                   
                     me[userConfigName].useTShirt = newV;
                    me.app.fireEvent(configChange);
                }
            }
        });

        panel.add( {
            xtype: 'textfield',
            baseCls: 'timerText',
            fieldLabel: 'Voting Time (min:sec)',
            labelWidth: 180,
            margin: '5 0 5 20',
            value: me[mainConfigName].votingTime  || votingTime,
            validator: function(value) {
                if (Ext.Date.parse(value, "i:s") !== undefined) {
                    me[mainConfigName].votingTime = value;
                    me.app.fireEvent(configSave);   //Save but don't change this game
                    return true;
                }
                return false;
            }
            
        });

        panel.add( {
            xtype: 'container',
            margin: '5 0 5 20',
            layout: 'hbox',
            items: [
                {
                    xtype: 'rallycheckboxfield',
                    itemId: 'selectStories',
                    fieldLabel: 'Stories',
                    labelWidth: 80,
                    labelAlign: 'right',
                    margin: '0 60 0 0',
                    listeners: {
                        change: function(item, setting) {
                            if (!setting) {
                                me[mainConfigName].artefactTypes = _.without(me[mainConfigName].artefactTypes, 'UserStory');
                                if ( me.getPanel().down('#selectDefects').getValue() === false ){
                                    me.getPanel().down('#selectDefects').setValue(true);
                                }
                            }
                            else {
                                me[mainConfigName].artefactTypes = _.union(me[mainConfigName].artefactTypes, ['UserStory']);
                            }
                            me.app.fireEvent(configChange);

                        }
                    },
                    value: _.indexOf(me[mainConfigName].artefactTypes, 'UserStory') >= 0
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
                                me[mainConfigName].artefactTypes = _.without(me[mainConfigName].artefactTypes, 'Defect');
                                if ( me.getPanel().down('#selectStories').getValue() === false ){
                                    me.getPanel().down('#selectStories').setValue(true);
                                }

                            }
                            else {
                                me[mainConfigName].artefactTypes = _.union(me[mainConfigName].artefactTypes, ['Defect']);
                            }
                            me.app.fireEvent(configChange);
                        }
                    },
                     value: _.indexOf(me[mainConfigName].artefactTypes, 'Defect') >= 0

                }
            ]
        });

        panel.add( {
            xtype: 'textarea',
            fieldLabel: 'Artefact Filter',
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
        });

        panel.add ( {
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    margin: '0 5 5 20',
                    fieldLabel: 'Extra User',
                    labelWidth: 60,
                    width: 280,
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
                    width: 80,
                    margin: '0 5 5 5',
                    handler: function() {
                        me.app.fireEvent('adduser', panel.down('#usersearchbox').getRecord());
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Remove',
                    itemId: 'delUserButton',
                    width: 80,
                    disabled: true,
                    margin: '0 5 5 5',
                    handler: function() {
                        me.app.fireEvent('removeuser', panel.down('#usersearchbox').getRecord());
                    }
                }
            ]
        });
        
        panel.add( {
            xtype: 'textarea',
            fieldLabel: 'Extra User List',
            itemId: 'extrauserlist',
            labelAlign: 'top',
            width: 460,
            value: me._getCurrentUserList(),
            margin: '0 20 5 20',
            readOnly: true   
        });
        this.configPanel = panel;
        return panel;
    },
});