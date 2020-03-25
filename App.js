
Ext.define('Niks.Apps.PokerGameConfig', {
    iterationConfigs: [], /** Each interation might have different config */
    activeStory: null,
    moderator: null,
    userConfigs: [], /** Contains 'active' as well as other layout info */
});

Ext.define('Niks.Apps.PokerUserConfig', {
    userOID: null
});

Ext.define('Niks.Apps.PlanningGame', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    _gameConfig: null,

    launch: function () {
        //Check for required fields in this project node

        //Create config page and then pull config from project node if exists. If not, create.
        //If not config already, ask the user if they are to be the Moderator for this.

        /** Set up a timer that reads the config every 1sec so that we pull changes from other users
         * 
         */

    },

    _createStoryBrowser: function() {
        var deferred = Ext.create('Deft.Deferred');
        return deferred.promise;

    },

    _createUserMenu: function() {
        /** Each user must have a way to save and restore their current settings/layout */
        var deferred = Ext.create('Deft.Deferred');
        return deferred.promise;

    },

    _createLeadMenu: function() {
        /** Lead menu must have access to the config page */
        var deferred = Ext.create('Deft.Deferred');
        return deferred.promise;

    },

    /** Make sure that the system is set up the way we need */
    _checkProjectConfig: function() {
        //Check field PlanningConfig exists on project model

        var deferred = Ext.create('Deft.Deferred');
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
    
    _getProjectConfig: function() {
        var deferred = Ext.create('Deft.Deferred');
        return deferred.promise;
    },

    /** Save the current config */
    _saveProjectConfig: function() {
        var deferred = Ext.create('Deft.Deferred');
        return deferred.promise;
    },

    _checkConfigChange: function(newConfig) {

    },

    //Create and hide the config page
    _createConfigPage: function() {
        /** Config page must have:
         * 1. Moderator Chooser
         * 2. Team member list - enables for this session
         * 3. Timer countdown duration
         * 4. Iteration for this session
         */
        var deferred = Ext.create('Deft.Deferred');
        return deferred.promise;
    },

    /** Make the main pages that the game players need
     * 
     */
    _createUserPage: function() {
        var deferred = Ext.create('Deft.Deferred');
        return deferred.promise;
    },

    _createLeadPage: function() {
        var deferred = Ext.create('Deft.Deferred');
        return deferred.promise;
    },

    /** Utility functions
     * 
     */

    _encodeMsg: function(msgType, msgText) {

    },

    _decodeMsg: function(msgType, msgText) {

    }
});
