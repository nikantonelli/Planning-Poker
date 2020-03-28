
Ext.define('Niks.Apps.PokerGameConfig', {
    extend: Niks.Apps.Panel,

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
    
    statics: {
        userIdField: "ObjectID"
    },

    /** We know of three config types right now: MainConfig, IterationConfig, UserConfig */
    initialiseConfig: function(fieldText) {
        this[mainConfigName] = this._decodeConfig(mainConfigName, fieldText);
        this[userConfigName] = this._decodeConfig(userConfigName, fieldText);
        this[iterConfigName] = this._decodeConfig(iterConfigName, fieldText);
    },

    getNamedConfig: function(name) {
        return this[name] || {};
    },

    _decodeConfig: function(requiredType, fieldText) {

        if ((fieldText === undefined) || ( fieldText.length === 0)) {
            return '';
        }
        var msgs = fieldText.split(this.configSplitter);
        var configs = {};
        _.each(msgs, function(msg) {
            var splitMsg = msg.split(',');
            if (splitMsg[0].length) {
                configs[splitMsg[0]] = splitMsg[1];
            }
        });
        return configs[requiredType] || {};
    },

    addUser: function(user) {   //Passed in a user record
        if ( _.find( this.userIDs, {userOID: user.get(this.self.userIdField)})) {
            console.log("Adding existing member - ignoring!");
        } else {
            this.userIDs.push(user[this.self.userIdField]);
        }
    },

    setModerator: function(user) {
        this[mainConfigName].moderatorID = user[this.self.userIdField];
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
                    property: this.self.userIdField,
                    value: id
                }
            ],
            listeners: {
                load: function(store, records, success) {
                    if (success) {
                        me.setModerator(records[0].data);
                        deferred.resolve(records[0].data);
                    }
                    else {
                        deferred.reject();
                    }
                }
            }
        });
        return deferred.promise;
    },

    includeSizedStories: function() {
        return !this.onlyUnsized;
    },

    _encodeMsg: function(msgType, msgText) {
        return this.configSplitter + msgType + "," + window.btoa(msgText);
    },

    _decodeMsg: function(msgType, msgText) {
        return window.atob(msgText.split(",").pop());
    },

    /* Gameconfig is the thing that is stored to the Project field. Must not be more than 32768 chars */
    getGameConfig: function() {
        return  this._encodeMsg(mainConfigName, JSON.stringify(this.mainConfig)) +
                this._encodeMsg(userConfigName, JSON.stringify(this.userConfig))+
                this._encodeMsg(iterConfigName, JSON.stringify(this.iterationConfig));
    },

    _createPanel: function() {
        var me = this;
        var panel = Ext.create('Ext.container.Container', {
            floating: true,
            width: 400,
            height: 400,
            baseCls: 'panel',
            hidden: true
        });
        panel.add( {
            xtype: 'field',
            id: 'curMod',
            fieldLabel: 'Current Moderator',
            labelWidth: 200,            
            margin: '10 0 10 20',
            baseBodyCls: 'textfield',
            readOnly: true,
            value: me.moderatorUser? me.moderatorUser['DisplayName']: 'Not Set'

        });
        panel.add( {
            xtype: 'rallyusercombobox',
            id: 'modChooser',
            labelWidth: 200,
            fieldLabel: 'Change Moderator To',
            valueField: this.self.userIdField,
            margin: '10 0 10 20',
            autoSelect: false,
            listeners: {
                //Setvalue fires when the thing is first set up with a null value.
                setvalue: function(entry) {
                    if (entry.value !== null) {
                        me.setModerator(entry.lastSelection[0]);
                        panel.down('#curMod').setValue(me.moderatorUser.get('DisplayName'));
                        Ext.create('Rally.ui.dialog.ConfirmDialog', {
                                title: "New Moderator",
                                message: "Restart session?",
                                listeners: {
                                    confirm: function() {
                                        //Set user up as moderator
                                        me.app.fireEvent(modChange);
                                        me.hidePanel();
                                    }
                                }
                            });
                        
                    }
                },
            }
        });

        this.configPanel = panel;
        return panel;
    },
});