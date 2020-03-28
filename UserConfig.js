/** Something to hold the current config of the user during this session
 * 
 */

Ext.define('Niks.Apps.PokerUserConfig', {
    extend: Niks.Apps.Panel,
    users: [],

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
    }

});