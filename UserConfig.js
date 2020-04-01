/** Something to hold the current config of the user during this session
 * 
 */

Ext.define('Niks.PokerCard', {
    extend: Ext.panel.Panel,
    margin: cardMargin,
    layout: 'vbox',
    autoScroll: true,

    constructor: function(config) {
        Ext.apply(this.config);
        this.callParent(arguments);
        var ls = this.card.get(cardSizeField);
        ls = (ls === null)?(ls === 0?'set to zero':'not set'):ls.toString();
//        console.log('Card: ', this.card.get(cardIdField), ' set to ', ls);
        this.add(
            {
                xtype: 'text',
                margin: cardMargin,
                text:  "Current Size: " + ls 
            }
        );
        this.add(
            {
                xtype: 'label',
                margin: cardMargin,
                grow: true,
                labelAlign: 'top',
                readOnly: true,
                autoScroll: true,
                html: this.card.get('Description')
            }
        )
        this.on('click', function() {
            debugger;
        })
    },

    config: {},

    // initComponent: function() {
    //     this.callParent(arguments);
    // }
});


Ext.define('Niks.Apps.PokerUserConfig', {
    extend: Niks.Apps.Panel,
    users: [],
    stories: [],

    userConfigName: {
            valueSeries: [0,1,2,3,5,8,13,20,50,100],
    },

    getConfig: function() {
        return this[userConfigName];
    },

    setConfig: function(config) {
        this[userConfigName] = config;
    },

    
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
    },

    getModeratorPanel: function() {

    },

    restart: function() {
        this.stories = [];
        this.getPanel().down('#cardspace').removeAll();
    },

    //Stories can come as the form of the records in a store or the valueSeries
    addStories: function( stories ) {
        var me = this;
        if (stories === null) {
            //Add the cards from the valueSeries because we are a standard user
        }
        else {
            _.each(stories, function(story) {
                me._addCardToPage(story);
            });
            //Add the moderators story cards
        }
    },

    _addCardToPage: function(story) {

        if ( _.find(this.stories, function(savedStoryID) {
                return story.get(cardIdField) === savedStoryID;
        })) {
            return;
        }
        this.stories.push(story.get(cardIdField));
        var page = this.getPanel();

//        var subpage = this.userOrModerator? 'discussion':'details';
       var cs = page.down('#cardspace');
        cs.add(Ext.create('Niks.PokerCard', {
            title: Ext.String.format('<a target="_blank" href={1}>{0} </a><a target="_blank" href={2} class="icon-chat"></a>', 
                        story.get(cardIdField), 
                        Rally.nav.Manager.getDetailUrl(story, {subPage: ''}),
                        Rally.nav.Manager.getDetailUrl(story, {subPage: 'discussion'})),
            width: cardWidth,
            height: cardHeight,
            card: story
        }));
    },

    //Singleton that never dies..... hopefully....
    _createPanel: function(userOrModerator) {   //0 = user, !0 = mod
        var me = this;
        this.userOrModerator = userOrModerator;

        var page = me.configPanel = Ext.create('Ext.container.Container', {
            width: '100%',
            height: 'auto',
            layout: 'hbox',
            id: 'userPage',
            items: [
                {
                    xtype: 'container',
                    id: 'menu',
                    width: 100,
                    margin: cardMargin,
                    cls:'clearpanel'
                },
                {
                    xtype: 'container',
                    id: 'cardspaceparent',
                    width: '50%',
                    flex: 1,
                    cls:'clearpanel'
                },
                {
                    xtype: 'container',
                    id: 'actions',
                    width: 400,
                    cls:'clearpanel'
                }
            ]
        });

        me.app.add(page);

        var cs = page.down('#cardspaceparent');
        cs.removeCls('x-panel-body-default');
        var numcols = Math.floor(cs.getWidth()/(cardWidth+(2*cardMargin)));
        numcols = (numcols>0)? numcols: 1;
        cs.add( {
            xtype: 'panel',
            id: 'cardspace',
            margin: 10,
            layout: {
                type: 'table',
                columns: numcols
            },
            bodyCls: 'userpanel',
        });

        if (this.userOrModerator) {
            page.down('#menu').add({
                xtype: 'rallybutton',
                width: 100,
                text: 'Config',
                margin: '10 10 0 10',
                handler: function() {
                    me.app.fireEvent('showConfig');
                }
            });
            page.down('#menu').add({
                xtype: 'rallybutton',
                width: 100,
                text: 'Iteration',
                margin: '10 10 0 10',
                handler: function() {
                    me.app.fireEvent('changeIteration');
                }
            });
        }
        page.down('#menu').add({
            xtype: 'rallybutton',
            width: 100,
            text: 'Refresh',
            margin: '10 10 0 10',
            handler: function() {
                me.app.fireEvent('refresh');
            }
        });

        return page;
    }

});