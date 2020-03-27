
Ext.define('Niks.Apps.PokerGameConfig', {
    extend: Niks.Apps.Panel,
    mixins: {
        observable:  Ext.util.Observable 
    },

    iterationConfigs: [], /** Each interation might have different config */
    activeStory: null,
    moderator: null,
    userConfigs: [], /** Contains 'active' as well as other layout info */
    onlyUnsized: false,

    statics: {
        userIdField: "ObjectID"
    },

    bubbleEvents: [
        modChange
    ],

    addUser: function(user) {   //Passed in a user record
        if ( _.find( this.userConfigs, {userOID: user.get(this.self.userIdField)})) {
            console.log("Adding existing member - ignoring!");
        } else {
            this.userConfigs.push(user);
        }
    },

    setModerator: function(user) {

        this.moderator = user[this.self.userIdField];
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
                        me.setModerator(records[0]);
                        deferred.resolve(records[0]);
                    }
                    else {
                        deferred.reject()
                    }
                }
            }
        });
        return deferred.promise;
    },

    // mergeConfig: function(newConfig) {
    //     Ext.merge(this, newConfig);
    // },

    includeSizedStories: function() {
        return !this.onlyUnsized
    },

    getGameConfig: function() {
        return {
            iterationConfigs: this.iterationConfigs,
            activeStory: this.activeStory,
            moderator: this.moderator,
            userConfigs: this.userConfigs,
            onlyUnsized: this.onlyUnsized
        };
    },

    _createPanel: function() {
        var me = this;
        var panel = Ext.create('Ext.container.Container', {
            floating: true,
            width: 400,
            height: 400,
            baseCls: 'panel',
//            autoShow: true
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
            value: me.moderatorUser? me.moderatorUser.get('DisplayName'): 'Not Set'

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
                        me.setModerator(entry.lastSelection[0])
                        panel.down('#curMod').setValue(me.moderatorUser.get('DisplayName'));
                        Ext.create('Rally.ui.dialog.ConfirmDialog', {
                                title: "New Moderator",
                                message: "Restart session?",
                                listeners: {
                                    confirm: function() {
                                        //Set user up as moderator
                                        debugger;
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