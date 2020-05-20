/** Something to hold the current config of the user during this session
 * 
 */

Ext.define('Niks.Apps.PokerUserConfig', {
    extend: Niks.Apps.Panel,
    
    getConfig: function() {
        return this[userConfigName];
    },

    setConfig: function(config) {
        this[userConfigName] = config;
    },

    
    /* This is called from something that has got a Store record not just a model */
    removeUser: function(userRecord) {
        /** Check if the user is in the array. If not, then add */
        var existingUser = _.find(this.users, function(user) {
            if (userRecord.get(userIdField) === user.get(userIdField)) {
                return true;
            }
        });
        if (existingUser !== undefined){
            this.users = _.filter(this.users, function(user) {
                return userRecord.get(userIdField) !== user.get(userIdField);
            });
        }
    },


    /* This is called from something that has got a Store record not just a model */
    addUser: function(userRecord) {
        /** Check if the user is in the array. If not, then add */
        if (!_.find(this.users, function(user) {
            if (userRecord.get('ObjectID') === user.get(userIdField)) {
                return true;
            }
        })){
            this.users.push(userRecord);
        }
    },


    removeExtraUser: function(userRecord){
        this.removeUser(userRecord);
        this._setVotes([]); //Redo the voting panel - clears out all votes unfortunately.

    },

    addExtraUser: function(user) {
        this.addUser(user);
        this._setVotes([]); //Redo the voting panel - clears out all votes unfortunately.
    },

    restart: function(iAmMod) {
        this.stories = [];
        this.destroyPanel();
        var page = this.getPanel(iAmMod);
        this.cardSelected = null;
        if (iAmMod) {
            this._doVotes();
        }
        return page;
    },

    //Stories can come as the form of the records in a store
    loadStories: function( stories ) {
        var me = this;
        if (me.getPanel().down('#cardspace')) { me.getPanel().down('#cardspace').removeAll(false);}
        me.stories = [];
        _.each(stories, function(story) {
            me._addCardToPage(story);
        });
    },

    _addCardToPage: function(story) {
        var page = this.getPanel();
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
        this.stories.push( card );
    },

    /** Mainconfig comes over from the app so that we can set the time up 
     *  when we are moderator
    */

    selectCard: function(card, mainConfig) {

        //Find our entry in this.stories for chosen card
        var cardSelected = _.find( this.stories, function(storyCard) {
            return card.story.get(cardIdField) === storyCard.story.get(cardIdField);
        });

        if (cardSelected === this.cardSelected) {
                this.cardSelected.removeCls('cardSelected');
                this.cardSelected  = null;
        }
        else {
            cardSelected.addCls('cardSelected');
            if (this.cardSelected)  {
                this.cardSelected.removeCls('cardSelected');
            }
            this.cardSelected = cardSelected;
            return this._setVoting(card, mainConfig);
        }
        this._checkVoteButton();
        return false;
    },

    _checkVoteButton: function() {
        var voteButton =  this.getPanel().down('#voteNow');
         if ( voteButton) {
             if ( this.cardSelected && this.cardSelected.vote) {
                 voteButton.enable();
             }
             else {
                 voteButton.disable();
             }
         }
    },

    _setVoting: function(card, mainConfig) {
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
                return card.story.get(cardIdField) === savedStory.story.get(cardIdField);
            });
            if ( foundStory  && foundStory.vote) {
                me.setVote(foundStory.vote);
            }
            else {
                me.clearVote();
            }

            /** Enable all the buttons  */
            var ap = this.configPanel.down('#actions');
            if (this.cardSelected) {
                _.each(ap.getChildItemsToDisable(), function(item) { item.enable();});
            } else {
                _.each(ap.getChildItemsToDisable(), function(item) { item.disable();});
                this.getPanel().down('#votemessage').update('Choose an item &rarr;');
            }
            return true;
        }
    },

    postedVote: function(card) {
        var foundStory = _.find(this.stories, function(savedStory) {
            return card.story.get(cardIdField) === savedStory.story.get(cardIdField);
        });
        foundStory.postedVote();
    },

    refreshVotes: function() {
        this._doVotes();
    },

    //Add button to send switchpanel message to app
    addSwitch: function() {
        var me = this;
        this.getPanel().down('#menu').add({
            xtype: 'rallybutton',
            width: 100,
            text: 'Switch View',
            margin: '10 10 0 10',
            handler: function() {
                me.app.fireEvent('switchpanel');
            }
        });
    },

    disableIterationButton: function() {
        this.getPanel().down('#iterationButton').disable();
    },

    enableIterationButton: function() {
        this.getPanel().down('#iterationButton').enable();
    },

    useTShirtSizing: function(tshirt) {
        this[userConfigName].useTShirt = tshirt;
    },

    setVote: function(vote) {
        var me = this;
        var storySelected = _.find( this.stories, function(card) {
            return me.cardSelected.story.get(cardIdField) === card.story.get(cardIdField);
        });
        storySelected.setVoteString(vote);
        this.getPanel().down('#votemessage').update('&larr; Vote '+(vote.tshirt?vote.size:vote.value).toString());
        this._checkVoteButton();
    },

    clearVote: function() {
        this.getPanel().down('#votemessage').update('Choose a vote &darr;');
        this._checkVoteButton();
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

    _setNameDiv: function(str) {
        return '<div class ="votename"><b>'+str+'</b></div>';
    },
    _setCastDiv: function(str) {
        return '<div class ="votesize"><b>'+str+'</b></div>';
    },
    _setDateDiv: function(str) {
        return '<div class ="votedate"><b>'+str+'</b></div>';
    },

    _setVotes: function(results) {
        var me = this;
        if (!this.configPanel) { return;}
        if (!results.length) { this._revealVotes = false;}
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
            html: this._setNameDiv("<u>Team Member</u>")
        });
        votesPanel.add( {
            html: this._setCastDiv("<u>Vote Cast</u>")
        });
        votesPanel.add( {
            html: this._setDateDiv("<u>When</u>")
        });
        
        var votesFound = [];

        _.each(me.users, function(user) {
            var foundUserAnswer = _.find(results, function(result) {
                return result.get('User').ObjectID === user.get('ObjectID');
            });
            var vote = "&nbsp";
            var answer = {};
            var timeAt = "&nbsp";
            if (foundUserAnswer !== undefined) {
                answer = foundUserAnswer.get('Text');
                answer =  JSON.parse(answer.split(pokerMsg.votePosted+':')[1].split('<')[0]);
                votesFound.push(answer);
                vote = this._revealVotes?(answer.tshirt?(answer.size+ ' ('+answer.value+')'):answer.value).toString(): '?';
                timeAt = foundUserAnswer.get('_CreatedAt');
            }
            votesPanel.add( {
                html: this._setNameDiv(user.get('_refObjectName')),
            });
            votesPanel.add( {
                html: this._setCastDiv(vote),
            });
            votesPanel.add( {
                html: this._setDateDiv(timeAt),
            });
            // Put this inside loop so that we don't have to check for null
            this.configPanel.down('#revealvotesbtn').enable();
            
        }, me);

        if ( this._revealVotes) {
            votesPanel.add( {
                html: '<div class="votestext">AVERAGE</div>'
            });
            var votesCount = votesFound.length, votesTotal = _.reduce(votesFound, function(result,vote, key) {
                return {
                    size: 'uk',
                    value: result.value + vote.value
                };
            });
            votesTotal = votesTotal.value;
            
            var nearest =  _.reduce(valueSeries, function(result, value, key) {
                var oldOne = Math.abs(result.value - (votesTotal/(votesCount?votesCount:1)));
                var newOne = Math.abs(value.value - (votesTotal/(votesCount?votesCount:1)));
                return (newOne < oldOne)? value:result;
            });

            votesPanel.add ( {
                html: '<div class="votestext">'+(votesFound.length?((me[userConfigName].useTShirt?(nearest.size+ ' ('+nearest.value+')'):nearest.value)):"-") + '</div>'
            });
            votesPanel.add ( {
                
                html: '<div class="votestext">'+(votesFound.length?(' ('+(votesTotal/(votesCount?votesCount:1)).toFixed(1)+')'): '&nbsp')+'</div>'
            });
        }
        else {
            votesPanel.add ( {
                html: '<div class="votestext">&nbsp</div>'
            });
            votesPanel.add ( {
                html: '<div class="votestext">&nbsp</div>'
            });
            votesPanel.add ( {
                html: '<div class="votestext">&nbsp</div>'
            });

        }

    },

    _getVotes: function() {
        var me = this;
        me._votes = null;
        me._revealVotes = false;

        var deferred = Ext.create('Deft.Deferred');
        if (!this.cardSelected) { 
            //Rally.ui.notify.Notifier.showWarning({message: 'No item selected'});
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
                value: this.cardSelected.story.get('_ref')
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
            if (this.cardSelected) {
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

    //Singleton that never dies..... hopefully....
    _createPanel: function(userOrModerator) {   //0 = user, !0 = mod
        var me = this;
        this.userOrModerator = userOrModerator;
        var page = me.configPanel = Ext.create('Ext.container.Container', {
            width: '100%',
            hideMode: 'display',
            height: me.app.getHeight(),
            layout: 'hbox',
            itemId: userOrModerator? 'modPage':'userPage',
            items: [
                {
                    xtype: 'container',
                    itemId: 'menu',
                    width: 120,
                    margin: cardMargin,
                    cls:'clearpanel'
                },
                {
                    xtype: 'container',
                    itemId: 'actions',
                    width: 400,
                    cls:'clearpanel',
                },
                {
                    xtype: 'container',
                    itemId: 'cardspaceparent',
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
                            itemId: 'countdowntimer',
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
                                        if ( this.cardSelected === null ){
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
                            itemId: 'votespanel',

                            width: '100%',
                            bodyCls: 'userpanel',

                            layout: {
                                type: 'table',
                                columns: 3,
                                tdAttrs: {
                                    style: {
                                        textAlign: 'center',
                                    }
                                }
                            },
                            defaults: {
                                bodyStyle: 'border:none'
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
                                    itemId: 'revealvotesbtn',
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
                itemId: 'votemessage',
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
                    itemId: 'sizespace',
                    margin: 10,
                    layout: {
                        type: 'table',
                        columns: 2,
                    },
                    bodyCls: 'userpanel',
                }
            );
            page.down('#actions').add(szsp);
            _.each(valueSeries, function(value) {
                var card = Ext.create('Niks.Apps.PokerCard', {
                    width: 150,
                    height: 80
                });
                szsp.add(card);
                value.tshirt = me[userConfigName].useTShirt;
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
            itemId: 'cardspace',
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
                itemId: 'iterationButton',
                width: 100,
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
                disabled: true,
                itemId: 'voteNow',
                text: 'Vote Now',
                margin: '10 10 0 10',
                handler: function() {
                        me.app.fireEvent('postvote');
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