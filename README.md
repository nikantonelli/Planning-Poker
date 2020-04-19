PlanningGame 
=========================

## Overview

One app that has a moderator screen and a dev team member screen. It uses ConversationPosts to send the votes back on a polling scheme right now. 
Webhooks is a future enhancements....sometime...

The app needs a field on the Project artifact to be able to store the config. This will be used in the future to hold the results of the last planning session in case you want to go back and  revisit. Currently it is expecting a string custom field called PlanningPokerConfig (aka c_PlanningPokerConfig). 

When first starting in a project, the app will ask if you want to be the moderator. Do this to start with, and then change it afterwards. The app uses the moderator setting to serve up the different pages. If the moderator is not available to reset this value, you can go to the custom field and delete/update the config entry directly. You have to have permissions to do this, though.

The moderator would configure the game so that you are either working to a particular iteration (current or future, NOT past!), or working on the unsized items in your team node. In my mind, zero size is not really an acceptable size, so should be revoted on or removed from the backlog. Once decided on, the users can click on Reload Game to get the next stories up ready for voting.

The moderator can choose a story to collate the votes on. The team members can vote on any story, but the moderator will only collate for the story they have chosen. Once collated, the moderator then can reveal them all at the same time. There is a timer implemented to help with this. The timer can be set through the config button on the moderator display.

At the moment, the moderator cannot vote, just moderate.

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
