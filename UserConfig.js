/** Something to hold the current config of the user during this session
 * 
 */

var cardSelected = null;

Ext.define('Niks.PokerCard', {
    extend: Ext.panel.Panel,
    margin: cardMargin,
    layout: {
        type: 'vbox',
        align: 'left'
    },
    autoScroll: true,
    config: {
        story: null
    },

    applyStory: function(story) {
        var me = this;
        this.story = story;
        var ls = story.get(cardSizeField);
        var description = story.get('Description');
        description = description.length?description:'<b>Please Enter A Description of the Required Effort</b>';
        ls = (ls === null)?(ls === 0?'set to zero':'not set'):ls.toString();

        this.add(
            {
                xtype: 'textfield',
                id: 'sizeText'+story.get(cardIdField),
                fieldLabel: 'Current Size',
                width: cardWidth - 30,
                labelWidth: 150,
                margin: '5 0 5 10',
                html: ls,
                fieldCls:  'clearpanel cardtext',
                labelCls: 'cardtext',
                cls: 'definedfield'
            }
        );

        var taf = Ext.create('Ext.form.Label',{
                margin: cardMargin,
                forId: 'sizeText'+story.get(cardIdField),
                width: cardWidth - 40,
                grow: true,
                hideLabel: true,
                readOnly: true,
                autoScroll: true,
                html: description,
                
            }
        );
        this.add(taf);

        this.getEl().on('click', function(evt, target) {
            if (target.nodeName === "A") {
                return;
            }
            if (this.hasCls('cardSelected')) {
                this.removeCls('cardSelected');
                if (cardSelected !== null) {
                    cardSelected  = null;
                }
            }
            else {
                this.addCls('cardSelected');
                if ( cardSelected !== null) {
                    cardSelected.removeCls('cardSelected');
                }
                cardSelected = this;
                this.up('#pokerApp').fireEvent('cardselected',this);
            }
        }, me);
    },
});


Ext.define('Niks.Apps.PokerUserConfig', {
    extend: Niks.Apps.Panel,
    users: [],
    stories: [],
    id: userConfigName+'Panel',
    userConfigName: {
            valueSeries: [0,1,2,3,5,8,13,20,50,100],
    },

    getConfig: function() {
        return this[userConfigName];
    },

    setConfig: function(config) {
        this[userConfigName] = config;
    },

    
    /* This is called from something that has got a Store record not just a model */
    addUser: function(userRecord) {
        /** Check if the user is in the array. If not, then add */
        if (!_.find(this.users, function(user) {
            if (userRecord.get('ObjectID') === user.get('ObjectID')) {
                return true;
            }
        })){
            this.users.push(userRecord);
        }
    },

    getModeratorPanel: function() {

    },

    restart: function() {
        this.stories = [];
        this.getPanel().down('#cardspace').removeAll();
    },

    //Stories can come as the form of the records in a store or the valueSeries
    addStories: function( stories ) {
        var me = this;
        if (stories === null) {
            //Add the cards from the valueSeries because we are a standard user
        }
        else {
            _.each(stories, function(story) {
                me._addCardToPage(story);
            });
            //Add the moderators story cards
        }
    },

    _addCardToPage: function(story) {

        if ( _.find(this.stories, function(savedStoryID) {
                return story.get(cardIdField) === savedStoryID;
        })) {
            return;
        }
        this.stories.push(story.get(cardIdField));
        var page = this.getPanel();

//        var subpage = this.userOrModerator? 'discussion':'details';
       var cs = page.down('#cardspace');

        var card = Ext.create('Niks.PokerCard', {
            title: Ext.String.format(
                '<table><tr><td>' +
                '<a target="_blank" href={1}>{0} </a>' + 
                '<a target="_blank" href={2} class="icon-chat"></a>' +
                '</td><td class="rightAlignField">' +
                '<p class="rightAlignField">{3}</p>' +
                '</td></tr></table>', 
                        story.get(cardIdField), 
                        Rally.nav.Manager.getDetailUrl(story, {subPage: ''}),
                        Rally.nav.Manager.getDetailUrl(story, {subPage: 'discussion'}),
                        story.get('Name')),
            width: cardWidth,
            height: cardHeight,
        });
        cs.add(card);
        card.setStory(story);
    },

    /** Mainconfig comes over from the app so that we can set the time up 
     * 
    */
    setVoting: function(card, mainConfig) {
        var me = this;
        this.votingCard = card;
        this.mainConfig = mainConfig;
        var actions = this.getPanel().down('#actions');
        if (this.timerRunning) {
            //Ask to stop and reset timer
            Ext.create('Rally.ui.dialog.ConfirmDialog',{
                title: 'Cancel current voting',
                message: "Stop the timer for the current session?",
                confirmLabel: 'Yes, please',
                listeners: {
                    confirm: function() {
                        me._stopTimer();
                        me._configureTimer(actions);
                    },
                    scope: me
                }
            });
        }
        else {
            this._configureTimer(actions);
            return true;
        }
        return false;
    },

    _timerRunning: 0,

    _stopTimer: function() {
        this._timerRunning = 0;
    },

    _configureTimer: function(actions) {
        if ((this.mainConfig === undefined) || (this.mainConfig.votingTime === "00:00")) {
            return;
        }
        var bits = this.mainConfig.votingTime.split(':');   //Shortcut as it should always be 00:00 format
        this._timerRunning = (bits[0] * 60) + bits[1];
        this.configPanel.down('#countdowntimer').setValue(this.mainConfig.votingTime);
        this.configPanel.down('#countdowntimer').getEl().removeCls('timerfinished');
        this.configPanel.down('#countdowntimer').getEl().removeCls('textBlink');
        this.configPanel.down('#countdowntimer').getEl().addCls('timerreset');


    },

    _getVotes: function() {
        var deferred = Ext.xcreate('Deft.Deferred');
        debugger;
        /** Get the discussion posts that are owned by the team members and contain the key string "VOTEPOSTED"
         * Soert by newest to oldest. Search through until you fdind entries for all the users. If not, then signal 
         * that some users have not posted.
         */

        var userfilters = [];
        _.each( this.users, function(user) {
            userFilters.push( {
                property: 'User',
                value: user.get('_ref')
            });
        })

        var filters = Rally.data.wsapi.Filter.or(userFilters);

        filters.push(
            {
                property: 'Artifact',
                value: cardSelected.story.get('_ref')
            }
        );

        filters.push(
            {
                property: 'Text',
                operator: 'contains',
                value: 'VOTEPOSTED'
            }
        );
        var discussionPosts = Ext.create('Rally.data.wsapi.Store', {
            model: 'ConversationPost',
            filters: Rally.data.wsapi.Filter.and(filters),
            autoLoad: true,
            listeners: {
                load: function(store, records, success) {
                    if (success){
                        deferred.resolve(records);
                    }
                    else {
                        deferred.reject();
                    }
                }
            }
        });
        return deferred.promise;

    },

    _countdownTimer: function(me) {
        if (me._timerRunning >0) {
            me._decrementTimer();
            me.configPanel.down('#countdowntimer').getEl().addCls('timerrunning');
            me.configPanel.down('#countdowntimer').getEl().removeCls('timerfinished');
            me.configPanel.down('#countdowntimer').getEl().removeCls('timerreset');
            me._timerRunning -= 1;
            setTimeout(me._countdownTimer, 1000, me);
        } else {
            if (cardSelected) {
                Ext.create('Rally.ui.dialog.ConfirmDialog', {
                    title: 'Timer Expired',
                    message: "Do you want to reveal the current voting?",
                    confirmLabel: 'Yes, please',
                    listeners: {
                        confirm: function() {
                            me.configPanel.down('#countdowntimer').getEl().removeCls('timerrunning');
                            me.configPanel.down('#countdowntimer').getEl().addCls('timerfinished');
                            me.configPanel.down('#countdowntimer').getEl().removeCls('textBlink');
                            me._getVotes();
                        },
                        cancel: function() {
                            me.configPanel.down('#countdowntimer').getEl().removeCls('timerrunning');
                            me.configPanel.down('#countdowntimer').getEl().addCls('timerfinished');
                            me.configPanel.down('#countdowntimer').getEl().removeCls('textBlink');

                        },
                        scope: me
                    }
                });
            }
            me.configPanel.down('#countdowntimer').getEl().addCls('timerfinished');
            me.configPanel.down('#countdowntimer').getEl().addCls('textBlink');

        }

    },
    _decrementTimer: function() {
        var bits = this.configPanel.down('#countdowntimer').getValue().split(':');   //Shortcut as it should always be 00:00 format
        if (bits.length !== 2) { return; }
        var timerNow = ((bits[0] * 60) + bits[1]) ;
        if (timerNow === 0) { return;}
        var timerNext = timerNow - 1;
        var minutes = Math.floor(timerNext/60);
        minutes = (minutes< 10) ? '0'+minutes: minutes.toString();
        var seconds = timerNext%60;
        seconds = (seconds< 10) ? '0'+seconds: seconds.toString();
        this.configPanel.down('#countdowntimer').setValue(minutes+":"+seconds);

    },

    //Singleton that never dies..... hopefully....
    _createPanel: function(userOrModerator) {   //0 = user, !0 = mod
        var me = this;
        this.userOrModerator = userOrModerator;

        var page = me.configPanel = Ext.create('Ext.container.Container', {
            width: '100%',
            layout: 'hbox',
            id: 'userPage',
            items: [
                {
                    xtype: 'container',
                    id: 'menu',
                    width: 100,
                    margin: cardMargin,
                    cls:'clearpanel'
                },
                {
                    xtype: 'container',
                    id: 'cardspaceparent',
                    width: '50%',
                    height: 800,
                    flex: 1,
                    cls:'clearpanel',
                    autoScroll: true
                },
                {
                    xtype: 'container',
                    id: 'actions',
                    width: 400,
                    cls:'clearpanel',
                    items: [
                        {
                            xtype: 'textfield',
                            id: 'countdowntimer',
                            width: '100%',
                            height: 50,
                            labelCls: 'cardtext',
                            fieldCls: 'clearpanel timertext timerreset',
                            fieldLabel: 'Countdown Timer',
                            labelAlign: 'left',
                            value: "00:00",
                            labelWidth: 120,
                            margin: '5 0 5 10',
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            items: [
                                {
                                    xtype: 'rallybutton',
                                    text: 'Start',
                                    width: 100,
                                    handler: function() {
                                        me._countdownTimer(me);
                                    }
                                },
                                {
                                    xtype: 'rallybutton',
                                    text: 'Stop',
                                    width: 100,
                                    handler: function() {
                                        me._timerRunning = 0;
                                    }
                                },
                                {
                                    xtype: 'rallybutton',
                                    text: 'Reset',
                                    width: 100,
                                    handler: function() {
                                        me._configureTimer();
                                    }
                                },

                            ]
                        }
                        
                    ]
                }
            ]
        });

        me.app.add(page);

        var cs = page.down('#cardspaceparent');
        cs.removeCls('x-panel-body-default');
        var numcols = Math.floor(cs.getWidth()/(cardWidth+(2*cardMargin)));
        numcols = (numcols>0)? numcols: 1;
        cs.add( {
            xtype: 'panel',
            id: 'cardspace',
            margin: 10,
            layout: {
                type: 'table',
                columns: numcols,
            },
            bodyCls: 'userpanel',
        });

        if (this.userOrModerator) {
            page.down('#menu').add({
                xtype: 'rallybutton',
                width: 100,
                text: 'Config',
                margin: '10 10 0 10',
                handler: function() {
                    me.app.fireEvent('showConfig');
                }
            });
            page.down('#menu').add({
                xtype: 'rallybutton',
                width: 100,
                text: 'Iteration',
                margin: '10 10 0 10',
                handler: function() {
                    me.app.fireEvent('changeIteration');
                }
            });
            page.down('#menu').add({
                xtype: 'rallybutton',
                width: 100,
                text: 'Remove Game',
                margin: '10 10 0 10',
                handler: function() {
                    me.app.fireEvent('removeGame');
                }
            });
        }
        page.down('#menu').add({
            xtype: 'rallybutton',
            width: 100,
            text: 'Reload Game',
            margin: '10 10 0 10',
            handler: function() {
                me.app.fireEvent('refresh');
            }
        });

        return page;
    }

});