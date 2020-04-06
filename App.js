var storyLoadTime = null;

Ext.define('Niks.Apps.TeamPicker', {
    constructor: function() {
        this.callParent();
    }
});

Ext.define('Niks.Apps.PlanningGame', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    id: 'pokerApp',

    //Only save the least amount of data in here. We only have 32768 chars to play with
    _GC: {},

    config: {
        configFieldName: "c_PlanningPokerConfig",
        configSplitter: '^'
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
                message: "Remove all game entries in this project (including game generated posts)?",
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
                                                me._UC.restart();
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
            me._getStoryChanges().then( {
                success: function(results) {
                    me._processStoryChanges(results);
                }
            });
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
            if (this._UC.setVoting(story, this._GC.getNamedConfig(mainConfigName))){     //Configure your own panel and if not running a timer send out message to all
                this._storySelected = story;    //Send message to other users when asked to post the vote
            }
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
                            Text: '<p>'+pokerMsg.votePosted+":"+me._voteSelected+'</p>',
                            Artifact: me._storySelected.story.get('_ref'),
                        });
                        record.save({
                            callback: function(result, operation) {
                                if (operation.wasSuccessful()) {
                                    Rally.ui.notify.Notifier.show({message: Ext.String.format('Vote Posted on {0} was {1}',
                                        me._storySelected.story.get('FormattedID'),
                                        me._voteSelected)});
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
        this._startGame();
    },

    _getStoryChanges: function() {
        var deferred = Ext.create('Deft.Deferred');
        var filters = [
            {
                property: 'LastUpdateDate',
                operator: '>',
                value: storyLoadTime, 
            }
        ];

        this._getStoryStore(filters).then({
            success: function(store) {
                deferred.resolve(store.getRecords());
            },
            failure: function(e) {
                console.log("Failed to load story changes", e);
            }
        });
        return deferred.promise;
    },

    _reloadGame: function() {
        /** Clear out existing data and settings 
         * We will need to refetch the config from the project 
         * */

        this._UC.restart();
        this._kickOff();
    },

    _iAmModerator: function() {
        return this.getContext().getUser().ObjectID === this._GC.getModerator().get('ObjectID');
    },

    _setUpUserScreen: function() {
        //Check for whether we are the moderator
        var iAmMod = this._iAmModerator();
        var page = this._UC.getPanel(iAmMod);
        this._UC.loadStories(this._storyStore.getRecords());
        page.show();
    },

    _getStoryStore: function(filters) {
        var me = this;
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.artifact.Store',{
            models: ['UserStory', 'Defect' ],
            context: this.getContext().getDataContext(),
            autoLoad: true,
            remoteSort: false,
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
                var filters = [{
                    property: 'Iteration',
                    value: iteration
                }];

                if (me._GC.onlyUnSizedStories()) {
                    filters.push( Rally.data.wsapi.Filter.or(
                    [
                        {
                            property: 'PlanEstimate',
                            operator: '=',
                            value: null
                        },
                        {
                            property: 'PlanEstimate',
                            operator: '=',
                            value: 0
                        }
                    ]));
                    filters = Rally.data.wsapi.Filter.and(filters);
                }
        
                me._getStoryStore(filters).then ({
                    success: function(store) {
                        me._storyStore = store;
                        me._setUpUserScreen();
                    },
                    failure: function(e) {
                        console.log("Failed to load stories", e);
                    }
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
         * Firstly, we need the team members
         */
        var record = this.projectStore.getRecords()[0];
        if ( record.get('TeamMembers').Count > 0) {
            record.getCollection('TeamMembers').load( {
                fetch: true,
                callback: function( members, operation, success) {
                    //Add all the team members to the GameConfig
                    if (success === true) {
                        Rally.ui.notify.Notifier.show({ message: "Team members loaded"});
                        _.each(members, function(member) {
                            me._UC.addUser(member);
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

    },

    launch: function () {
        var me = this;
        me._GC = Ext.create('Niks.Apps.PokerGameConfig', {
            app: me,
            project: me.getContext().getProject()
        });

        me._UC = Ext.create('Niks.Apps.PokerUserConfig', {
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
                                        me._GC.setModerator( me.getContext().getUser());
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
                                }
                            });
                        }
                    },
                    failure: function(e) {
                        console.log(e);
                    },
                    scope: me
                });
            },
            failure: function(e) {
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
                if (model.hasField(me.configFieldName)) {
                    deferred.resolve(model);
                } else {
                    //Here, we need to ask if they want to set up the new field (need to be workspace admin)
                    deferred.reject("Correct Config not available");
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
        this._GC.updateNamedConfig(userConfigName, this._UC.getConfig());

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
