Ext.define('Niks.Apps.PokerCard', {
    extend: Ext.panel.Panel,
    margin: cardMargin,
    layout: {
        type: 'vbox',
        align: 'left'
    },
    autoScroll: true,
    config: {
        story: null,
        voteSize: null
    },
    applyVoteSize: function(size) {
        this.voteSize = size;
        var me = this;
        var btn = Ext.create('Rally.ui.Button',{
            margin: 10,
            disabled: true,
            text: (size.tshirt? size.size: size.value).toString(),
            cls: 'buttontext',
            width: this.width - 22,
            height: this.height - 22,
            handler : function() {
                this.up('#pokerApp').fireEvent('voteselected',me.voteSize);
            }
        });
        this.add( btn);
    },

    postedVote: function() {
        this.voted = this.vote;
        this.setVoteString();
    },

    setVoteString: function (vote) {
        if (vote && (vote !== this.vote)) { 
            this.vote = vote;
        }
        if ( (vote && (vote !== this.vote)) ||
            (this.vote !== this.voted)) 
        {
            this.tf.removeCls('definedfield');
            this.tf.addCls('erroredfield');
        }
        else {
            this.tf.addCls('definedfield');
            this.tf.removeCls('erroredfield');
        }
        var ls = this.story.get((this.story.get('_type').indexOf('portfolioitem') >= 0)?piSizeField:cardSizeField);
        ls = ((ls !== null)&& (ls !== undefined))?(ls === 0?'set to zero':ls.toString()):'not set';
        this.tf.update(Ext.String.format('Current Size: {0} {1} {2}',
            ls, 
            this.vote?" - You chose: "+(this.vote.tshirt? this.vote.size: this.vote.value):'',
            this.voted?' and have voted: '+(this.voted.tshirt? this.voted.size: this.voted.value) :''));
    },

    applyStory: function(story) {
        var me = this;
        this.story = story;

        this.tf = Ext.create('Ext.form.field.Text', {
                xtype: 'textfield',
                itemId: 'sizeText'+story.get(cardIdField),
                width: cardWidth - 30,
                margin: '5 0 5 10',
                cls: 'definedfield'
            });
        this.add( this.tf );
        this.setVoteString();

        var description = story.get('Description');
        description = description.length?description:'<p>Description field Empty</p><p><b>Please go to Artefact and enter a Description of the Required Effort</b></p>';
        var taf = Ext.create('Ext.form.Label',{
                margin: cardMargin,
                forId: 'sizeText'+story.get(cardIdField),
                width: cardWidth - 40,
                grow: true,
                hideLabel: true,
                readOnly: true,
                autoScroll: true,
                html: description
            }
        );
        this.add(taf);

        this.getEl().on('click', function(evt, target) {
            if (target.nodeName === "A") {
                return;
            }
            this.up('#pokerApp').fireEvent('cardselected',this);
        }, me);
    },
});
