Ext.define('Niks.Apps.PokerIterationConfig', {
    extend: Niks.Apps.Panel,
    id: iterConfigName+'Panel',
    constructor: function() {
        this.callParent(arguments);
        this[iterConfigName] = {
            currentIteration: null
        };
    },

    getConfig: function() {
        return this[iterConfigName];
    },
    setConfig: function(config) {
        Ext.merge(this[iterConfigName], config);
    },
    
    _createPanel: function() {
        var me = this;
        var panel = Ext.create('Ext.panel.Panel', {
            floating: true,
            width: 400,
            baseCls: 'configPanel',
            hidden: true,
            closable: true,
            closeAction: 'hide',
        });

        me.getCurrentIteration().then( {
            success: function(iteration) {
                panel.add( {
                    xtype: 'rallyiterationcombobox',
                    margin: 40,
                    hideTrigger: true,
                    store: me._iterationStore,
                    storeConfig: {
                        autoLoad: false
                    },
                    value: iteration,
                    listeners: {
                        select: function(store,record) {
                            if (Array.isArray(record)){
                                me[iterConfigName].currentIteration = record[0].get('_ref');
                            } else {
                                me[iterConfigName].currentIteration = record.get('_ref');
                            }
                            me.app.fireEvent('configChanged');
                        }
                    }
                });

            }

            // Don't need failure as we post error essage in _getIterations
            // failure: function() {
            //     Rally.ui.notify.Notifier.showWarning({message: 'Cannot fetch iterations for config panel'});
            // }
        });
        me.configPanel = panel;
        return panel;
    },

    getCurrentIteration: function() {
        var me = this;
        if (!this[iterConfigName].currentIteration) {
            return this._getIterations(true);
        }
        else {
            var deferred = Ext.create("Deft.Deferred");
            if (!me._iterationStore) {
                me._getIterations(false).then({
                    success: function() {
                        deferred.resolve( me[iterConfigName].currentIteration);
                    }
                })
            } else {
                deferred.resolve( me[iterConfigName].currentIteration);   /* Resolve straightaway as we already have it. */
            }
            return deferred.promise;
        }
    },

    _getIterations: function(setIteration) {

        var me =this;
        /** In this project, find the iteration that is ongoing */
        var deferred = Ext.create("Deft.Deferred");

        Ext.create('Rally.data.wsapi.Store', {
            model: Ext.identityFn('Iteration'),
            autoLoad: true,
            context: me.app.getContext().getDataContext(),
            fetch: ["Name", "StartDate", "EndDate", "ObjectID", "State", "PlannedVelocity"],
            filters: [
                {
                    property: "EndDate",
                    operator: ">",
                    value: new Date()
                }
            ],
            sorters: [
                {
                    property: 'StartDate',
                    direction: 'ASC'
                }
            ],
            listeners: {
                load: function(store, records, success) {
                    if (success) {
                        me._iterationStore = store;
                        if (setIteration) {
                            me[iterConfigName].currentIteration = store.getAt(0).get('_ref');
                        }
                        deferred.resolve(me[iterConfigName].currentIteration);
                    }
                    else {
                        Rally.ui.notify.Notifier.showWarning({message: 'No appropriate Iterations available'});
                        deferred.reject();
                    }
                }
            }
        });
        return deferred.promise;
    },

});