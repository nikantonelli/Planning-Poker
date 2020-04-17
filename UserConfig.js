/** Something to hold the current config of the user during this session
 * 
 */

var cardSelected = null;

Ext.define('Niks.Apps.PokerCard', {
    extend: Ext.panel.Panel,
    margin: cardMargin,
    layout: {
        type: 'vbox',
        align: 'left'
    },
    autoScroll: true,
    config: {
        story: null,
        voteSize: null
    },
    applyVoteSize: function(size) {
        this.voteSize = size;
        var me = this;
        var btn = Ext.create('Rally.ui.Button',{
            margin: 10,
            disabled: true,
            text: size.toString(),
            cls: 'buttontext',
            width: this.width - 22,
            height: this.height - 22,
            handler : function() {
                this.up('#pokerApp').fireEvent('voteselected',me.voteSize);
            }
        });
        this.add( btn);
    },

    applyStory: function(story) {
        var me = this;
        this.story = story;
        var ls = story.get(cardSizeField);
        var description = story.get('Description');
        description = description.length?description:'<p>Description field Empty</p><p><b>Please go to Artefact and enter a Description of the Required Effort</b></p>';
        ls = (ls === null)?(ls === 0?'set to zero':'not set'):ls.toString();


        var tf = Ext.create('Ext.form.field.Text', {
                xtype: 'textfield',
                id: 'sizeText'+story.get(cardIdField),
                width: cardWidth - 30,
                margin: '5 0 5 10',
                cls: 'definedfield'
            });
        this.add( tf );
        tf.update(Ext.String.format('Current Size: {0}',ls));

        var taf = Ext.create('Ext.form.Label',{
                margin: cardMargin,
                forId: 'sizeText'+story.get(cardIdField),
                width: cardWidth - 40,
                grow: true,
                hideLabel: true,
                readOnly: true,
                autoScroll: true,
                html: description
            }
        );
        this.add(taf);

        this.getEl().on('click', function(evt, target) {
            if (target.nodeName === "A") {
                return;
            }
            
            if (cardSelected === this) {
                this.removeCls('cardSelected');
                cardSelected  = null;
            }
            else {
                this.addCls('cardSelected');
                if (cardSelected !== null)  {
                    cardSelected.removeCls('cardSelected');
                }
                cardSelected = this;
            }
            this.up('#pokerApp').fireEvent('cardselected',this);
        }, me);
    },
});


Ext.define('Niks.Apps.PokerUserConfig', {
    extend: Niks.Apps.Panel,
    users: [],
    stories: [],
    id: userConfigName+'Panel',
    valueSeries: [1,2,3,5,8,13,20,40,80],

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

    restart: function(iAmMod) {
        this.stories = [];
        this.destroyPanel();
        this.getPanel(iAmMod)
        cardSelected = null;
        if (iAmMod) {
            this._doVotes();
        }
    },

    //Stories can come as the form of the records in a store or the valueSeries
    loadStories: function( stories ) {
        var me = this;
        if (me.getPanel().down('#cardspace')) { me.getPanel().down('#cardspace').removeAll(false);}
        me.stories = [];
        if (stories === null) {
            //Add the cards from the valueSeries because we are a standard user
        }
        else {
            _.each(stories, function(story) {
                me._addCardToPage(story);
            });
            //Add the moderators story 
        }
    },

    _addCardToPage: function(story) {

        if ( _.find(this.stories, function(savedStory) {
                return story.get(cardIdField) === savedStory.id;
        })) {
            return;
        }
        this.stories.push({ id: story.get(cardIdField), vote: null});
        var page = this.getPanel();

//        var subpage = this.userOrModerator? 'discussion':'details';
       var cs = page.down('#cardspace');

        var card = Ext.create('Niks.Apps.PokerCard', {
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
     *  when we are moderator
    */
    setVoting: function(card, mainConfig) {
        var me = this;
        this.votingCard = card;
        this[mainConfigName] = mainConfig;
        var actions = this.getPanel().down('#actions');
        if (this.userOrModerator) {
            //For the moderator, we need to manage the timer and fetch the votes
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
        }
        else {
            // Set the votemessage field if we already have chosen on this one.
            var foundStory = _.find(this.stories, function(savedStory) {
                return card.story.get(cardIdField) === savedStory.id;
            });
            if ( foundStory  && foundStory.vote) {
                me.setVote(foundStory.vote);
            }
            else {
                me.clearVote();
            }

            /** Enable all the buttons  */
            var ap = this.configPanel.down('#actions');
            if (cardSelected) {
                _.each(ap.getChildItemsToDisable(), function(item) { item.enable();});
            } else {
                _.each(ap.getChildItemsToDisable(), function(item) { item.disable();});
                this.getPanel().down('#votemessage').update('Choose an item &rarr;');
            }
            return true;
        }
    },

    refreshVotes: function() {
        this._doVotes();
    },

    disableIterationButton: function() {
        this.getPanel().down('#iterationButton').disable();
    },

    enableIterationButton: function() {
        this.getPanel().down('#iterationButton').enable();
    },

    setVote: function(vote) {
        var storySelected = _.find( this.stories, function(story) {
            return cardSelected.story.get(cardIdField) === story.id;
        });
        storySelected.vote = vote;
        this.getPanel().down('#votemessage').update('&larr; Vote '+vote.toString());
    },

    clearVote: function() {
        this.getPanel().down('#votemessage').update('Choose a vote &darr;');
    },

    _timerRunning: 0,

    _stopTimer: function() {
        this._timerRunning = 0;
    },

    _configureTimer: function(actions) {
        if ((this[mainConfigName] === undefined) || (this[mainConfigName].votingTime === "00:00")) {
            return;
        }
        var bits = this[mainConfigName].votingTime.split(':');   //Shortcut as it should always be 00:00 format
        this._timerRunning = (bits[0] * 60) + bits[1];
        this.configPanel.down('#countdowntimer').setValue(this[mainConfigName].votingTime);
        this.configPanel.down('#countdowntimer').getEl().removeCls('timerfinished');
        this.configPanel.down('#countdowntimer').getEl().removeCls('textBlink');
        this.configPanel.down('#countdowntimer').getEl().addCls('timerreset');


    },

    _revealVotes: false,
    _votes: null,

    _doVotes: function() {
        var me = this;
        me._getVotes().then({
            success: function(results) {
                me._setVotes(results);
            }
        });
    },

    _setVotes: function(results) {
        var me = this;
        var votesPanel = this.configPanel.down('#votespanel');
        votesPanel.removeAll();
         var showHideBtn = this.configPanel.down('#revealvotesbtn');
         if (me._revealVotes === false) {
            showHideBtn.setText('Reveal Votes');
        }
        else {
            showHideBtn.setText('Hide Votes');
        }
        votesPanel.add( {
            html: '<u>Team Member</u>',
            width: 180
        });
        votesPanel.add( {
            html: '<u>Vote Cast</u>',
            width: 80
        });
        votesPanel.add( {
            html: '<u>When</u>',
            width: 140
        });
        
        _.each(me.users, function(user) {
            var foundUserAnswer = _.find(results, function(result) {
                return result.get('User').ObjectID === user.get('ObjectID');
            });
            var answer = "None";
            var timeAt = "&nbsp";
            if (foundUserAnswer !== undefined) {
                answer = foundUserAnswer.get('Text');
                answer = this._revealVotes? answer.split(pokerMsg.votePosted+':')[1].split('<')[0]: '?';
                timeAt = foundUserAnswer.get('_CreatedAt');
            }
            votesPanel.add( {
                html: user.get('_refObjectName'),
            });
            votesPanel.add( {
                html: answer,
            });
            votesPanel.add( {
                html: timeAt,
            });
            // Put this inside loop so that we don't have to check for null
            this.configPanel.down('#revealvotesbtn').enable();
            
        }, me);
    },

    _getVotes: function() {
        var me = this;
        me._votes = null;
        me._revealVotes = false;

        var deferred = Ext.create('Deft.Deferred');
        if (cardSelected === null) { 
            Rally.ui.notify.Notifier.showWarning({message: 'No item selected'});
            deferred.resolve([]);
            return deferred.promise;
        }

        /** Get the discussion posts that are owned by the team members and contain the key string "VOTEPOSTED"
         * Soert by newest to oldest. Search through until you fdind entries for all the users. If not, then signal 
         * that some users have not posted.
         */

        var userFilters = [];
        _.each( this.users, function(user) {
            userFilters.push( {
                property: 'User',
                value: user.get('_ref')
            });
        });

        var filters = [Rally.data.wsapi.Filter.or(userFilters)];

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
                value: pokerMsg.votePosted
            }
        );
        Ext.create('Rally.data.wsapi.Store', {
            model: 'ConversationPost',
            filters: Rally.data.wsapi.Filter.and(filters),
            autoLoad: true,
            sorters: [
                {
                    property: 'CreationDate',   //Get this way around so that we can fetch the latest one first
                    direction: 'DESC'
                }
            ],
            listeners: {
                load: function(store, records, success) {
                    if (success){
                        me._votes = records;
                        deferred.resolve(records);
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
                // Ext.create('Rally.ui.dialog.ConfirmDialog', {
                //     title: 'Timer Expired',
                //     message: "Refresh Votes?",
                //     confirmLabel: 'Yes, please',
                //     listeners: {
                //         confirm: function() {
                            me.configPanel.down('#countdowntimer').getEl().removeCls('timerrunning');
                            me.configPanel.down('#countdowntimer').getEl().addCls('timerfinished');
                            me.configPanel.down('#countdowntimer').getEl().removeCls('textBlink');
                            me._doVotes();
                        // },
                        // cancel: function() {
                        //     me.configPanel.down('#countdowntimer').getEl().removeCls('timerrunning');
                        //     me.configPanel.down('#countdowntimer').getEl().addCls('timerfinished');
                        //     me.configPanel.down('#countdowntimer').getEl().removeCls('textBlink');

                        // },
                        // scope: me
                    }
//                });
//            }
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

    _userVoteSelected: null,

    //Singleton that never dies..... hopefully....
    _createPanel: function(userOrModerator) {   //0 = user, !0 = mod
        var me = this;
        this.userOrModerator = userOrModerator;
        var page = me.configPanel = Ext.create('Ext.container.Container', {
            width: '100%',
            height: me.app.getHeight(),
            layout: 'hbox',
            id: 'userPage',
            items: [
                {
                    xtype: 'container',
                    id: 'menu',
                    width: 120,
                    margin: cardMargin,
                    cls:'clearpanel'
                },
                {
                    xtype: 'container',
                    id: 'actions',
                    width: 400,
                    cls:'clearpanel',
                },
                {
                    xtype: 'container',
                    id: 'cardspaceparent',
                    width: '50%',
                    height: '100%',
                    flex: 1,
                    cls:'clearpanel',
                    autoScroll: true
                }
            ]
        });

        if (userOrModerator) {
            page.down('#actions').add(
                {
                    xtype: 'container',
                    margin: '10 0 0 0',
                    cls: 'userpanel',
                    items: [
                        {
                            xtype: 'textfield',
                            id: 'countdowntimer',
//                            width: '100%',
                            height: 50,
                            margin: 10,
                            labelCls: 'cardtext',
                            fieldCls: 'clearpanel timertext timerreset',
                            fieldLabel: 'Countdown Timer',
                            labelAlign: 'left',
                            value: "00:00",
                            readOnly: true,
                            labelWidth: 120,
        //                    margin: '5 0 5 10',
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            items: [
                                {
                                    xtype: 'rallybutton',
                                    text: 'Start',
                                    margin: 10,
                                    width: 100,
                                    handler: function() {
                                        if ( cardSelected === null ){
                                            Rally.ui.notify.Notifier.showWarning({message: 'No story selected'});
                                        }else {
                                            me._countdownTimer(me);
                                        }
                                    }
                                },
                                {
                                    xtype: 'rallybutton',
                                    text: 'Stop',
                                    margin: 10,
                                    width: 100,
                                    handler: function() {
                                        me._timerRunning = 0;
                                    }
                                },
                                {
                                    xtype: 'rallybutton',
                                    text: 'Reset',
                                    width: 100,
                                    margin:10,
                                    handler: function() {
                                        me._configureTimer();
                                    }
                                },

                            ]
                        },
                        {
                            xtype: 'panel',
                            id: 'votespanel',
                            width: '100%',
                            bodyCls: 'userpanel',
                            margin: '10 0 10 0',
                            layout: {
                                type: 'table',
                                columns: 3
                            },
                            defaults: {
                                bodyStyle: 'padding:10px;border:none'
                            }
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            items: [
                                {
                                    xtype: 'rallybutton',
                                    text: 'Refresh Votes',
                                    margin: 10,
                                    width: 100,
                                    handler: function() {
                                        me._doVotes();
                                    }
                                },
                                {
                                    xtype: 'rallybutton',
                                    id: 'revealvotesbtn',
                                    text: 'Reveal Votes',
                                    margin: 10,
                                    width: 100,
                                    disabled: true,
                                    handler: function() {
                                        me._revealVotes = !me._revealVotes;
                                        me._setVotes(me._votes);
                                    }
                                },
                                {
                                    xtype: 'rallybutton',
                                    margin: 10,
                                    width: 100,
                                    text: 'Delete Votes',
                                    handler: function() {
                                        me.app.fireEvent('removeGame');
                                    }
                                }
                            ]
                        }
                    ]
                }
            );
        }
        else {
            //We are a user here, so we can add the size selectors to the actions panel and add a vote button
            page.down('#actions').add( {
                xtype: 'label',
                id: 'votemessage',
                grow: true,
                margin: 10,
                hideLabel: true,
                readOnly: true,
                html: 'Choose an item &rarr; ',
                cls: 'clearpanel timertext'
            });
            var szsp = Ext.create('Ext.panel.Panel',
                {
                    xtype: 'panel',
                    id: 'sizespace',
                    margin: 10,
                    layout: {
                        type: 'table',
                        columns: 2,
                    },
                    bodyCls: 'userpanel',
                }
            );
            page.down('#actions').add(szsp);
            _.each(me.valueSeries, function(value) {
                var card = Ext.create('Niks.Apps.PokerCard', {
                    width: 150,
                    height: 80
                });
                szsp.add(card);
                card.setVoteSize(value);
            });
        }
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
                margin: 10,
                text: 'Config',
                margin: '10 10 0 10',
                handler: function() {
                    me.app.fireEvent('showConfig');
                }
            });
            page.down('#menu').add({
                xtype: 'rallybutton',
                id: 'iterationButton',
                width: 100,
                margin: 10,
                text: 'Iteration',
                margin: '10 10 0 10',
                handler: function() {
                    me.app.fireEvent('changeIteration');
                }
            });
            
        }
        else {
            page.down('#menu').add({
                xtype: 'rallybutton',
                width: 100,
                text: 'Vote Now',
                margin: '10 10 0 10',
                handler: function() {
                        me.app.fireEvent('postvote');
                }
            });
        }
        page.down('#menu').add({
            xtype: 'rallybutton',
            margin: 10,
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