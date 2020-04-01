
Ext.define('Niks.Apps.TeamPicker', {
    constructor: function() {
        this.callParent();
    }
});

Ext.define('Niks.Apps.PlanningGame', {
    extend: 'Rally.app.App',
    componentCls: 'app',

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
        configchanged: function() {
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
            Rally.ui.notify.Notifier.show({message: 'Refreshing Game'});
            this._getProjectConfig().then( {
                success: function() {
                    debugger;
                }
            });
        },
        showConfig: function() {
            if (this._iAmModerator()){
                this._GC.showPanel();
            }
        }
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
        this._UC.addStories(iAmMod?this._storyStore.getRecords():null);
        page.show();
    },

    _kickOff: function() {
        var me = this;
        /** When we come here, everything should be in place to start a new game
         * Now fetch the User Stories - with the option of only those not sized yet
         */
        this._getCurrentIteration().then({
            success: function(iteration) {
                var filters = [{
                    property: 'Iteration',
                    value: iteration.get('_ref')
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

                me._storyStore = Ext.create('Rally.data.wsapi.Store', {
                    model: 'HierarchicalRequirement',
                    filters: filters,
                    context: {
                        projectScopeUp: false,
                        projectScopeDown: false
                    },
                    autoLoad: true,
                    listeners: {
                        load: function(store, records, success) {
                            if (success) {
                                Rally.ui.notify.Notifier.show({message: Ext.String.format("Loaded {0} stories", records.length)});
                                me._setUpUserScreen();
//                                me._GC.showPanel();
                            }else {
                                Rally.ui.notify.Notifier.showWarning({message: "No stories found in this iteration/project node"});
                            }
                        },
                        scope: me
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

    _getCurrentIteration: function() {

        /** In this project, find the iteration that is ongoing */
        var deferred = Ext.create("Deft.Deferred");

        this._iterationStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'Iteration',
            autoLoad: true,
            context: {
                projectScopeUp: false,
                projectScopeDown: false
            },
            filters: [
                {
                    property: "StartDate",
                    operator: "<",
                    value: new Date()
                },
                // {
                //     property: 'EndDate',
                //     operator: ">",
                //     value: new Date()
                // }
            ],
            sorters: [
                {
                    property: 'StartDate',
                    direction: 'DESC'
                }
            ],
            listeners: {
                load: function(store, records, success) {
                    if (success) {
                        deferred.resolve(records[0]);
                    }
                    else {
                        Rally.ui.notify.Notifier.show({message: 'No appropriate Iterations available'});
                    }
                }
            }
        });
        return deferred.promise;
    },
});
