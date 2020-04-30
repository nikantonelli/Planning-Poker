PlanningGame 
=========================

## Overview

One app that has a moderator screen and a dev team member screen. It uses ConversationPosts to send the votes back on a polling scheme right now.

Webhooks is not appropriate for a Javascript app like this.

## Setup

The app needs a field on the Project artifact to be able to store the config. This will be used in the future to hold the results of the last planning session in case you want to go back and  revisit. Currently it is expecting a "Text" custom field called PlanningPokerConfig (aka c_PlanningPokerConfig). 

When first starting in a project, the app will ask if you want to be the moderator. Do this to start with, and then change it afterwards. 

## Using the app

The app uses the moderator setting to serve up the different pages. If the moderator is not available to reset this value, you can go to the custom field and delete/update the config entry directly. You have to have permissions to do this, though.

There are two options for story selection:
1. Those that are not sized (or have size of zero). To enable this, tick the box for "Fetch Unsized Only" on the moderators Config panel.
2. Those in a particular iteration. Untick the above box and then use the Iteration selector in the moderators Iteration panel.
The app respects the context you have, so if you select Project Scope Down/Project Scope Up, it will use those.

In my mind, zero size is not really an acceptable size, so should be revoted on or removed from the backlog. Once all stories are decided on, the users can click on Reload Game to get the next stories up ready for voting.

The moderator can choose a story to collate the votes on. The team members can vote on any story, but the moderator will only collate for the story that they have chosen. Once collated, the moderator then can reveal them all at the same time. There is a timer implemented to help with this. The timer can be set through the config button on the moderator display. It will do a vote refresh on timer expiration.

The app will use the most recent vote from a person. If the person votes more than once, then that is fine, the app just ignores the old ones. This means that you don't have to remember to clear out the old votes every time you do an in-session revote. You could even never delete the votes if you ever want to go back and look at what happeded during a session.

At the moment, the moderator cannot vote, just moderate. If someone wants to do both right now, then you will need to have two logins, a moderator and a team member, and do each one from a different browser, e.g. Safari and Chrome, or Firefox and Chrome. This is due to the way the browsers cache/share the information that the login uses.

When a consensus is reached, the moderator can click on the FormattedID link and go to the story and update the size. There is also a 'Chat' link next to the FormattedID that will take you to the 'Discussions' tab in the user story details page.

The team members can also make use of the link to have a look at more details. It will open in a separate tab so as not to disturb your voting app.

There are probably some bugs in here, but it generally works!

## Moderator Screen
![alt text](https://github.com/nikantonelli/Planning-Poker/blob/master/Images/ModeratorScreen.png)

## Team Member Screen
![alt text](https://github.com/nikantonelli/Planning-Poker/blob/master/Images/TeamMemberScreen.png)

## Game config panel
![alt text](https://github.com/nikantonelli/Planning-Poker/blob/master/Images/GameConfig.png)

## Iteration Selection
![alt text](https://github.com/nikantonelli/Planning-Poker/blob/master/Images/IterationConfig.png)

## License

PlanningGame is released under the MIT license.  See the file [LICENSE](./LICENSE) for the full text.

##Documentation for SDK

You can find the documentation on our help [site.](https://help.rallydev.com/apps/2.1/doc/)
