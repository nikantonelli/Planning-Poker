Ext.define('Niks.Apps.PlanningGame', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    itemId: 'pokerApp',

    //Only save the least amount of data in here. We only have 32768 chars to play with
    _GC: {},

    config: {
        configFieldName: "c_PlanningPokerConfig",
        configSplitter: '^',
        showVotePanel: false    //Initial view for Moderator
    },

    statics: {
        SAVE_FAIL_RETRIES: 5
    },

    listeners: {
        removeGame: function() {
            var filters = [];
            //Get all the message types from array
            _.each(Object.keys(pokerMsg), function (msg) {
                filters.push({
                    property: 'Text',
                    operator: 'contains',
                    value: pokerMsg[msg]
                });
            });
            var me = this;
            //Remove all tagged conversation posts for stories in the project node and remove the contents of the Project custom field
            Ext.create('Rally.ui.dialog.ConfirmDialog', {
                title: 'Clean up from game',
                message: "Remove all game generated posts?",
                confirmLabel: 'Yes',
                listeners: {
                    confirm: function() {
                        Ext.create('Rally.data.wsapi.Store', {
                            model: 'ConversationPost',
                            filters: Rally.data.wsapi.Filter.or(filters),
                            autoLoad: true,
                            context: me.getContext().getDataContext(),
                            listeners: {
                                load: function(store, records, successful) {
                                    var recordCount = records.length;
                                    var promises = [];
                                    if (successful) {
                                        _.each(records, function(record) {
                                            promises.push(record.destroy());   //Dangerous, but necessary.
                                        });
                                        Deft.Promise.all(promises).then({
                                            success: function() {
                                                Rally.ui.notify.Notifier.showWarning({ message: Ext.String.format(' {0} Records Deleted', recordCount)});
                                                me._reloadGame();
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }
                }
            });
        },

        switchpanel: function() {
            if ( this.showVotePanel ) {
                this.showVotePanel = false;
                this.userPage.hide();
                this.modPage.show();
            }
            else {
                this.showVotePanel = true;
                this.userPage.show();
                this.modPage.hide();                
            }
        },

        configsave: function() {
            this._saveProjectConfig();
        },

        configchanged: function() {
            //GC itself updates directly from panel, so no need to fetch here
            this._saveProjectConfig().then({
                success: function() {
                    /** Config saved and restart from scratch */
                    this._reloadGame();
                },
                failure: function(e) {
                    console.log("Failed to save project config",e);
                },
                scope: this
            });
        },
        refresh: function() {
            var me = this;
            Rally.ui.notify.Notifier.show({message: 'Refreshing Game'});

            /** We may not do anything with the config at this point. We can catch team member changes on restart. So, really we only need 
             * to catch story changes
            */
            me._startGame();
        },
        showConfig: function() {
            if (this._iAmModerator()){
                this._GC.showPanel();
            }
        },
        changeIteration: function() {
            if (this._iAmModerator()){
                this._IC.showPanel();
            }
        },
        cardselected: function(story) {
            console.log('cardselected: ', story);
            this._UC.selectCard(story,this._GC.getNamedConfig(mainConfigName));
            if (this._iAmModerator()) {
                this._MC.selectCard(story,this._GC.getNamedConfig(mainConfigName));
            }
            this._storySelected = story;    //Send message to other users when asked to post the vote
        },

        voteselected: function(vote) {
            this._voteSelected = vote;
            this._UC.setVote(vote);
        },

        postvote: function() {
            var me = this;
            if (this._voteSelected && this._storySelected) {
                Rally. data.ModelFactory.getModel({
                    type: 'ConversationPost',
                    success: function(model) {
                        var record = Ext.create(model, {
                            Text: '<p>'+pokerMsg.votePosted+":"+JSON.stringify(me._voteSelected)+'</p>',
                            Artifact: me._storySelected.story.get('_ref'),
                        });
                        record.save({
                            callback: function(result, operation) {
                                if (operation.wasSuccessful()) {
                                    Rally.ui.notify.Notifier.show({message: Ext.String.format('Vote Posted on {0} was {1}',
                                        me._storySelected.story.get('FormattedID'),
                                        me.getSetting('useTShirt')?me._voteSelected.size: me._voteSelected.value)});
                                    me._UC.postedVote(me._storySelected);
                                }
                                else {
                                    Rally.ui.notify.Notifier.showWarning({message: 'Failed to post vote. Please retry'});
                                }
                            }
                        });
                    }
                });
            }
        }
    },

    _voteSelected: null,
    _storySelected: null,

    _processStoryChanges: function() {
        //FIXME:
        this._reloadGame();
    },

    _reloadGame: function() {
        /** Clear out existing data and settings 
         * We will need to refetch the config from the project 
         * */

        //this._UC.restart(this._iAmModerator());
        this._kickOff();
    },

    _iAmModerator: function() {
        return this.getContext().getUser().ObjectID === this._GC.getModerator().get('ObjectID');
    },

    _setUpUserScreen: function() {
        //Check for whether we are the moderator
        var iAmMod = this._iAmModerator();

        if (iAmMod) {
            this.modPage = this._MC.restart(true);
            this._MC.addSwitch();
            this.modPage.show();
            this.userPage = this._UC.restart(false);
            this._UC.addSwitch();
            this.userPage.hide();
            var noCompilerMessage = this._GC.getConfigValue('allowIterationSelector')? this._MC.enableIterationButton():this._MC.disableIterationButton();
        }
        else {
            this.userPage = this._UC.restart(false);
            this.userPage.show();
        }
        if ( this._storyStore) {
            if (iAmMod) {
                this._MC.loadStories(this._storyStore.getRecords());
            }
            this._UC.loadStories(this._storyStore.getRecords());
        }
    },

    _getStoryStore: function(filters) {
        var me = this;
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.artifact.Store',{
            models: me._GC.getConfigValue('artefactTypes'),
            context: this.getContext().getDataContext(),
            autoLoad: true,
            pageSize: storyFetchLimit,
            limit: storyFetchLimit,
            sorters: [
                {
                    property: 'DragAndDropRank',
                    dir: 'DESC'
                }

            ],
            fetch: ['FormattedID','TargetDate', 'Description', 'Discussion', 'LatestDiscussionAgeInMinutes','LastUpdateDate', 'Name', 'State', 'ScheduleState', 'Owner', 'PlanEstimate'],
            filters: filters,
            listeners: {
                load: function(store, records, success) {
                    if (success) {
                        storeLoadTime = new Date();
                        Rally.ui.notify.Notifier.show({message: Ext.String.format("Loaded {0} stories", records.length)});
                        deferred.resolve(store);
                    }else {
                        Rally.ui.notify.Notifier.showWarning({message: "No stories found in this iteration/project node"});
                        deferred.reject(null);
                    }
                },
                scope: me
            }
        });
        return deferred.promise;
    },

    _kickOff: function() {
        var me = this;
        /** When we come here, everything should be in place to start a new game
         * Now fetch the User Stories - with the option of only those not sized yet
         */
        me._IC.getCurrentIteration().then({
            success: function(iteration) {
                var filters = [];

                /** If the config has a Story Filter string, use that as well
                 * 
                 */
                var storyFilter = me._GC.getConfigValue('storyFilter');
                if (storyFilter) {
                    filters.push(Rally.data.wsapi.Filter.fromQueryString(storyFilter));
                }

                if (me._GC.getConfigValue('allowIterationSelector')) {
                    
                //     filters.push( Rally.data.wsapi.Filter.or(
                //     [
                //         {
                //             property: 'PlanEstimate',
                //             operator: '=',
                //             value: null
                //         },
                //         {
                //             property: 'PlanEstimate',
                //             operator: '=',
                //             value: 0
                //         }
                //     ]));
                // }
                // else {
                    filters.push({
                        property: 'Iteration',
                        value: iteration
                    });
                }
                filters = Rally.data.wsapi.Filter.and(filters) || [];
        
                me._getStoryStore(filters).then ({
                    success: function(store) {
                        me._storyStore = store;
                    },
                    failure: function(e) {
                        console.log("Fatal failure to load stories. Clean out the project config and start again", e);
                    }
                }).always( function() {
                    me._setUpUserScreen();
                });
            },
            failure: function(e) {
                console.log("Didn't find a 'current' iteration", e);
            }
        });

    },

    _loadGameConfig: function() {
        var me = this;

        /** We need to load up the project specific config now.
         */
         this._UC.useTShirtSizing( this._GC.getConfigValue('useTShirt'));

        if (this._iAmModerator()) {
            this._MC.useTShirtSizing( this._GC.getConfigValue('useTShirt'));
            /* Firstly, we need the team members
            */
            var record = this.projectStore.getRecords()[0];
            if ( record.get('TeamMembers').Count > 0) {
                record.getCollection('TeamMembers').load( {
                    fetch: true,
                    filters: [
                        {
                            property: 'Disabled',
                            value: false
                        }
                    ],
                    callback: function( members, operation, success) {
                        //Add all the team members to the GameConfig
                        if (success === true) {
                            Rally.ui.notify.Notifier.show({ message: "Team members loaded"});
                            _.each(members, function(member) {
                                me._MC.addUser(member);
                            });
                            me._kickOff();
                        }
                        else {
                            console.log("Team members field unavailable");
                        }
                    },
                    scope: me
                });
            }
            else {
                Rally.ui.notify.Notifier.showWarning({ message: "Team members not configured"});
            }
        }
        else {
            me._kickOff();
        }

    },

    launch: function () {
        var me = this;
        me._GC = Ext.create('Niks.Apps.PokerGameConfig', {
            app: me,
            project: me.getContext().getProject()
        });

        //Users voting panel
        me._UC = Ext.create('Niks.Apps.PokerUserConfig', {
            app: me,
            project: me.getContext().getProject()
        });

        //Moderators control panel
        me._MC = Ext.create('Niks.Apps.PokerUserConfig', {
            app: me,
            project: me.getContext().getProject()
        });

        me._IC = Ext.create('Niks.Apps.PokerIterationConfig', {
            app: me,
            project: me.getContext().getProject()
        });

        this._startGame();
    },

    _startGame: function() {
        var me = this;

        //Check for required fields in this project node

        //Create config page and then pull config from project node if exists. If not, create.
        //If not config already, ask the user if they are to be the Moderator for this.

        /** Set up a timer that reads the config every 1sec so that we pull changes from other users
         * 
         */

        this._checkProjectFieldConfig().then( {
            success: function() {   //Just need to get the store next
                this._getProjectConfig().then({
                    success: function(projConfig) {
                        if (projConfig.hasOwnProperty("moderatorID")){
                            // Ready to go
                            //get the moderator from the saved config ID and give it to the gameConfig to fetch the full user
                            me._GC.setModeratorFromId(projConfig.moderatorID). then ({
                                success: function() {
                                    me._loadGameConfig();
                                },
                                failure: function() {
                                    console.log('Failed to set moderator from ID');
                                }
                            });
                        }
                        else {
                            //Set up new config
                            Ext.create('Rally.ui.dialog.ConfirmDialog', {
                                title: "New Config",
                                message: "Are you moderator for this session?",
                                listeners: {
                                    confirm: function() {
                                        //Set user up as moderator
                                        me._GC.setModeratorFromId( me.getContext().getUser()[userIdField]).then({
                                            success: function() {
                                                me._saveProjectConfig().then({
                                                    success: function() {
                                                        /** Config saved and we are ready to go */
                                                        me._loadGameConfig();
                                                    },
                                                    failure: function(e) {
                                                        console.log("Failed to save project config",e);
                                                    },
                                                    scope: me
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    },
                    failure: function(e) {
                        Rally.ui.notify.Notifier.showWarning({ message: e});
                        console.log(e);
                    },
                    scope: me
                });
            },
            failure: function(e) {
                Rally.ui.notify.Notifier.showWarning({ message: e});
                console.log(e);
            },
            scope: me
        });

    },

    _createStoryBrowser: function() {
        var deferred = Ext.create("Deft.Deferred");
        return deferred.promise;

    },

    _createUserMenu: function() {
        /** Each user must have a way to save and restore their current settings/layout */
        var deferred = Ext.create("Deft.Deferred");
        return deferred.promise;

    },

    _createLeadMenu: function() {
        /** Lead menu must have access to the config page */
        var deferred = Ext.create("Deft.Deferred");
        return deferred.promise;

    },

    /** Make sure that the system is set up the way we need */
    _checkProjectFieldConfig: function() {
        var me = this;
        //Check field PlanningConfig exists on project model
        var deferred = Ext.create("Deft.Deferred");

        Rally.data.ModelFactory.getModel({
            type: "Project",
            fetch: true,
            success: function(model) {
                //Add any prechecks here
                if (model.hasField(me.configFieldName) && (model.getField(me.configFieldName).type.type === 'string') ) {
                    deferred.resolve(model);
                } else {
                    //Here, we need to ask if they want to set up the new field (need to be workspace admin)
                    deferred.reject("Correct Config on Project artefact not available");
                }
            },
            failure: function() {
                //Shouldn't happen unless Rally is down
                deferred.reject("Failed to get Project Model");
            }
        });
        return deferred.promise;
    },

    /** As the game progresses, we need to save the state of the game. 
     * We will need to do retries due to concurrency errors that we might get with a number
     * of people trying to update the same field on the Project.
     * 
     * We also will need to be able to reload the last config to get back to where we were 
     * in the game before, if there is ever any issues (browser crash, network error, etc., etc.)
     *  For this, we should put a "refresh" button on the top menu bar
    */
    
    _getProjectConfig: function() {   /** parameter provided is Project Model, but not the actual data */
        var me = this;
        var deferred = Ext.create("Deft.Deferred");
        /** 
         * The current context should contain the Project record that we are currently at. 
         * We could change this to be a project picker if that becomes a useful feature.
         * Even if we update the Project field, then the environment keeps that handily local.
        */
        var project = this.getContext().getProject();
        me.projectStore = Ext.create( 'Rally.data.wsapi.Store', {
            model: 'Project',
            filters: [{
                property: 'ObjectID',
                value: project.ObjectID
            }],
            autoLoad: true,
            fetch: true,
            listeners: {
                load: function(store, records) {
                    me._GC.initialiseConfig(records[0].get(this.configFieldName));
                    me._UC.setConfig(me._GC.getNamedConfig(userConfigName)); 
                    me._MC.setConfig(me._GC.getNamedConfig(userConfigName)); 
                    me._IC.setConfig(me._GC.getNamedConfig(iterConfigName));
                    var currentConfig = me._GC.getNamedConfig(mainConfigName);
                    deferred.resolve(currentConfig);
                },
                scope: me
            }
        });

        return deferred.promise;
    },

    _failedSave: 0,

    /** Save the current config */
    _saveProjectConfig: function(existingDefer) {
        var me = this;
        this._GC.updateNamedConfig(iterConfigName, this._IC.getConfig());
        this._GC.updateNamedConfig(userConfigName, this._MC.getConfig());

        var deferred = (existingDefer === undefined) ? Ext.create("Deft.Deferred") : existingDefer;
        var currentConfig = this._GC.getGameConfig();

        var record = this.projectStore.getRecords()[0];
        record.set(this.configFieldName, currentConfig);
        record.save({
            success: function() {
                this._failedSave = 0;
                Rally.ui.notify.Notifier.show({ message: "Config Saved to Project"});
                deferred.resolve();
            },
            failure: function() {
                if (this._failedSave < this.self.SAVE_FAIL_RETRIES) {
                    this._saveProjectConfig(deferred);
                }
                else {
                    deferred.reject("Failed to save Project Config");
                }
            },
            scope: me
        });
        return deferred.promise;
    },

    _checkConfigChange: function(newConfig) {
        console.log(newConfig);
    },

    //Create and hide the config page
    _createConfigPage: function() {
        /** Config page must have:
         * 1. Moderator Chooser
         * 2. Team member list - enables for this session
         * 3. Timer countdown duration
         * 4. Iteration for this session
         */
        var deferred = Ext.create("Deft.Deferred");
        return deferred.promise;
    },

    /** Make the main pages that the game players need
     * 
     */
    _createUserPage: function() {
        var deferred = Ext.create("Deft.Deferred");
        return deferred.promise;
    },

    _createLeadPage: function() {
        var deferred = Ext.create("Deft.Deferred");
        return deferred.promise;
    },
});
