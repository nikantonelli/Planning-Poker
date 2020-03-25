Ext.define('Niks.Apps.PokerUserConfig', {
    userOID: null,

    constructor: function(userRecord) {
        this.callParent();
        this.userOID = userRecord.get("ObjectID");
    }
});