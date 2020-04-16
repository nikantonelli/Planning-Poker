Ext.define('Niks.Apps.Panel', {

    bubbleEvents: [],

    constructor: function(config) {
        //this.callParent(arguments);
        Ext.applyIf(this, config);
    },

    getPanel: function(param) {
        return this.configPanel || this._createPanel(param);
    },

    showPanel: function() {
        this.getPanel().show();
    },

    hidePanel: function() {
        this.getPanel().hide();
    },

    destroyPanel: function() {
        if (this.configPanel) {
            this.getPanel().destroy();
            this.configPanel = null;
        }
    },



});
