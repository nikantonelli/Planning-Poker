Ext.define('Niks.Apps.PokerGameConfig', {
    iterationConfigs: [], /** Each interation might have different config */
    activeStory: null,
    moderator: null,
    userConfigs: [], /** Contains 'active' as well as other layout info */

    addUser: function(user) {   //Passed in a user record
debugger;
        if ( _.find( this.userConfigs, {userOID: user.get("ObjectID")})) {
            console.log("Adding existing member - ignoring!");
        } else {
            this.userConfigs.push(user);
        }
    },

    mergeConfig: function(newConfig) {
        Ext.merge(this, newConfig);
    }
});