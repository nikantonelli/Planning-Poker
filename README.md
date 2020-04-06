PlanningGame 
=========================

## Overview

One app that has a moderator screen and a dev team member screen. It uses ConversationPosts to send the votes back on a polling scheme right now. 
Webhooks is a future enhancements....sometime...

The app needs a field on the Project artifact to be able to store the config. This will be used in the future to hold the results of the last planning session in case you want to go back and  revisit. Currently it is expecting a custom field called PlanningPokerConfig (aka c_PlanningPokerConfig). 

When first starting in a project, the app will ask if you want to eb the moderator. Do this to start with, and then change it afterwards. The app uses the moderator setting to serve up the different pages.

The moderator would configure the game so that you are working to a particular iteration (current or future, NOT past!). The moderator can choose to include all stories, or all those with a 0 size and 'unset' ones. Zero size is not really an acceptable size, so should be reworked.

RThe moderator can choose a story to collate the votes on. The team members can vote on any story, but the moderator will only collate for the story they have chosen. Once collated, the moderator then can reveal them all at the same time. There is a timer implemented to help with this. THe timer can be set through the config button on the moderator display.

At the moment, the moderator cannot vote.

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
