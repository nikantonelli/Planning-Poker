
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
        onlyUnsized: false,
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

    onlyUnSizedStories: function() {
        return this[mainConfigName].onlyUnsized;
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

    _createPanel: function() {
        var me = this;
        var panel = Ext.create('Ext.panel.Panel', {
//        var panel = Ext.create('Ext.container.Container', {
            floating: true,
            width: 400,
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
            labelWidth: 200,            
            margin: '10 0 10 20',
            baseBodyCls: 'textfield',
            readOnly: true,
            value: me.moderatorUser? me.moderatorUser.get('UserName'): 'Not Set'

        });
        panel.add( {
            xtype: 'rallyusercombobox',
            id: 'modChooser',
            fieldLabel: 'Change Moderator To',
            valueField: userIdField,
            labelWidth: 200,
            margin: '10 0 10 20',
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
            fieldLabel: "Fetch Unsized Only",
            id: 'unsizedOnly',
            value: me[mainConfigName].onlyUnsized,
            labelWidth: 200,
            margin: '10 0 10 20',
            listeners: {
                change: function( tickbox, newV, oldV, opts) {
                    me[mainConfigName].onlyUnsized = newV;
                    me.app.fireEvent(configChange);
                }
            }
        });

        panel.add( {
            xtype: 'textfield',
            baseCls: 'timerText',
            fieldLabel: 'Voting Time (min:sec)',
            labelWidth: 200,
            margin: '10 0 10 20',
            value: me[mainConfigName].votingTime  || votingTime,
            validator: function(value) {
                if (Ext.Date.parse(value, "i:s") !== undefined) {
                    me[mainConfigName].votingTime = value;
                    me.app.fireEvent('configsave');   //Save but don't change this game
                    return true;
                }
                return false;
            }
            
        });

        this.configPanel = panel;
        return panel;
    },
});