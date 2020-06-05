PlanningGame 
=========================

## Overview

One app that has a moderator screen and a dev team member screen. It uses ConversationPosts to send the votes back on a polling scheme right now.

Webhooks is not appropriate for a Javascript app like this.

## Setup

The app needs a field on the Project artifact (do NOT make it on the UserStory - it won't work!) to be able to store the config. This will be used in the future to hold the results of the last planning session in case you want to go back and  revisit. Currently it is expecting a "Text" custom field called PlanningPokerConfig (aka c_PlanningPokerConfig). 

When first starting in a project, the app will ask if you want to be the moderator. Do this to start with, and then change it afterwards. 

## Using the app

The app uses the moderator setting to serve up the different pages. If the moderator is not available to reset this value, you can go to the projects custom field and delete/update the config entry directly. You have to have permissions to do this, though.

There are two options for story selection:
1. Those that are filtered by the query in the moderators config panel.
2. Those in a particular iteration. Tick the box in the moderators panel to Enable Iteration Selector and then use the Iteration selector in the moderators Iteration panel. The query filter is still applied, so be aware.

To get just Unsized stories, you can add this filter:

    (PlanEstimate = null)
    
To get Unsized and zero sized, you can add this filter:

    ((PlanEstimate = null) OR (PlanEstimate = 0))
    
The app respects the context you have, so if you select Project Scope Down/Project Scope Up, it will use those.

In my mind, zero size is not really an acceptable size, so should be revoted on or removed from the backlog. Once all stories are decided on, the users can click on Reload Game to get the next stories up ready for voting. The first 50 stories are loaded only. This is by design and is to make sure the app loads in a reasonable time to start with.

The moderator can set whether the Team Members only get to see T-Shirt sizing via the Config panel. The moderator panel always shows the value, but will also show the T-shirt size the team member has chosen. The T-Shirt sizes are currently hardcoded into the app, but you can change them yourself - just look for the string "valueSeries" in the html that you loaded in. If you use the App-uncompressed.html file, it will be easy to read.

The moderator can choose a story to collate the votes on. The team members can vote on any story, but the moderator will only collate for the story that they have chosen. Once collated, the moderator then can reveal them all at the same time. There is a timer implemented to help with this. The timer can be set through the config button on the moderator display. It will do a vote refresh on timer expiration.

The app will use the most recent vote from a person. If the person votes more than once, then that is fine, the app just ignores the old ones. This means that you don't have to remember to clear out the old votes every time you do an in-session revote. You could even never delete the votes if you ever want to go back and look at what happened during a session.

The moderator can have both pages, Moderator and Voter - there is a "Switch View" in the lefthand panel to change between them.

When a consensus is reached, the moderator can click on the FormattedID link and go to the story and update the size. There is also a 'Chat' link next to the FormattedID that will take you to the 'Discussions' tab in the user story details page.

The team members can also make use of the link to have a look at more details. It should open in a separate tab so as not to disturb your voting app.

There are probably some bugs in here, but it generally works!

## Moderator Screen

![alt text](https://github.com/nikantonelli/Planning-Poker/blob/master/Images/ModeratorScreen.png)

## Team Member Screen

![alt text](https://github.com/nikantonelli/Planning-Poker/blob/master/Images/TeamMemberScreen.png)

## Game config panel

The app can work in two modes: Portfolio and Team. Use the selector checkboxes for one or the other. Iteration selection is disabled in Portfolio mode. In portfolio mode, the moderator can choose the type of interest from the combobox that appears at the top of the main page. If the moderator changes this, the config is stored but team members have to reload their page to get the new config. Note: it is not ever going to be possible to actively ping users with changes in this app - so don't ask for it :-)

![alt text](https://github.com/nikantonelli/Planning-Poker/blob/master/Images/GameConfig.png)

## Iteration Selection

![alt text](https://github.com/nikantonelli/Planning-Poker/blob/master/Images/IterationConfig.png)

## License

PlanningGame is released under the MIT license.  See the file [LICENSE](./LICENSE) for the full text.

##Documentation for SDK

You can find the documentation on our help [site.](https://help.rallydev.com/apps/2.1/doc/)
