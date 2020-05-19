/** Event Passing */
const modChange = 'moderatorchanged';
const configChange = 'configchanged';
const configSave = 'configsaver';   //Save but don't change this game

/** Configuration naming  */
const mainConfigName = 'MainConfig';
const userConfigName = 'UserConfig';
const iterConfigName = 'IterConfig';

/* Display card  */

const cardWidth = 400;
const cardHeight = 300;
const cardMargin = 10;
const cardSizeField = 'PlanEstimate';
const cardIdField = 'FormattedID';

/** Configuration utils */

const configSplitter1 = '^';
const configSplitter2 = '|';

/* Game numbers */

const votingTime = '00:10';
const userIdField = "ObjectID";
const storyFetchLimit = 50;

/* Poker 'post' types */

const pokerMsg = 
{ 
    votePosted: 'POKER_VOTE_POSTED',
};

const valueSeries = [
        { 
            size: 'XS',
            value: 1,
        },{ 
            size: 'S',
            value: 2,
        },{ 
            size: 'M',
            value: 3,
        },{ 
            size: 'L',
            value: 5,
        },{ 
            size: 'XL',
            value: 8,
        },{ 
            size: 'XXL',
            value: 13,
        },{ 
            size: 'XXXL',
            value: 20,
        }, { 
            size: 'Too Big',
            value: 40,
        }
    ];