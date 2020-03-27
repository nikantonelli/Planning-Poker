Ext.define('Niks.Apps.Panel', {

    bubbleEvents: [],

    constructor: function(config) {
        //this.callParent(arguments);
        Ext.applyIf(this, config);
    },

    // initEvents: function() {
    //     this.callParent(arguments);
    //     this.addEvents( bubbleEvents )
    //     this.enableBubble( bubbleEvents );
    // },

    getPanel: function() {
        if (this.configPanel === undefined) {
            this._createPanel();
        }
        return this.configPanel;
    },

    showPanel: function() {
        this.getPanel().show();
    },

    hidePanel: function() {
        this.getPanel().hide();
    },

});
