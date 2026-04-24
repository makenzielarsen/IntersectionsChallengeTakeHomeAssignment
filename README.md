Okay! Hello to the reader! I'm Makenzie. I've decided to take on the intersections challenge. So my first thought is that I want to overengineer this and make a whole simulation similar to the frogger game I made in school (it's on my website if you wanna try it out), but that is most likely too much so I'll try to not overengineer it. Okay so first thing I wanna do here is break up the challenge into bite size chunks to help with the overwhelm of a whole problem. Overall we wanna make a simulation of a intersection with cars able to travel in the usual four way light directions as well as some interactive capabilities with the pedestrian crosswalk buttons. So I am going to break it down into the following steps:

Step 1: Make One Light that changes color on a timer
- I just wanna make one light that changes color based on a timer. For simplifying the space I'm gonna need in the long run I am not gonna make it the traditional one light per color that we see at american intersections. I'm gonna have one basic circle at the top of each lane (not the right lane since that doesn't need a light) that will change colors based on the timer that the cars should follow.

Step 2: Replicate so that there are 12 lights total (left, straight 1, staight 2 for each of the 4 sides). Functionality hooked together
- Okay now that I have one light that changes based on a time I'm gonna go ahead and make 12 of those lights. We need to arrange it so that there are three lights on each side of the canvas. Okay from there we need to hook the timer functionality of some of the lights together following the loop details below:

North/South Left Protected Turns (2 Lights Green at the same time)
North/South Straight Lanes (4 Lights Green at the same time)
East/West Left Protected Turns (2 Lights Green at the same time)
East/West Straight Lanes (4 Lights Green at the same time)

Step 3: Arrange lights into intersection pattern
- Okay the lights are already in position but I want the lights to be contained with lanes. It took me a couple tries to get on the same page with claude, the lanes were lined up with the straight lanes connecting at first. Now that we understand each other that the four lanes on the left will be reserved for outbound traffic things are looking better. I made an incorrect assumption that we could divide our available space by eight to get the lane widths so the intersection is overlapping instead of making a cross-shape but that was easy enough to change.

Step 4: Add cars moving through the intersection while a light is green. Cars arriving should be randomized.
- From there is a bit of a big step, adding in randomized cars. I found a basic car sprite on the open game art website and uploaded that as a resource. I gave claude access to my frogger school assignment. In that assigment I made a randomizer that would make cars randomly appear and head down the road so that seems to have helped guiding claude into a pattern for randomization. Things are looking good!

Step 5: Edge cases
- By edge cases I more mean style and behavior changes for specific paths. For instance the cars turning left into each other needed to be changed from a abrupt 90 degree turn to a slow arc to avoid visually crashing with the cars turning left on the other side. I also made adjustments to the behavior of the right turning cars. At first I had them just yolo turning right but then remembered that usually when one is pulling up to a red stoplight you are supposed to come to a full stop and check for oncoming traffic and turn when you can. Me and Claude then had some beef, I asked it several times to change the behavior of the right turners to just ALWAYS come to a full stop, check for traffic, then turn right when it is safe but I kept seeing cars turning right without stopping in practice. Which at that point it seemed that I had unintentionally intrenched the AI in its beliefs about right turns so I had it write me a skill and claude file so I could clear and start again. Which totally worked, with the new AI context it immediately found the problem and right turners always stopped. And from there I included an exception for turning right without needing to stop if the straight lights next to it are green as well. Here I am also gonna add the "Smart Features" for the lights, since the cars move quite quickly across the screen I've made it so that if there are no cars passing through the intersection for three seconds to go ahead and go to the next light phase. I also made a smart feature to detect if there are any cars waiting at the light so if we are looking to turn on the North/South left turn lights but there's no one waiting to skip that light entirely and move on to the next light.

Step 6: Blinking Orange Light - Unprotected Left turns
- Okay re-reading the challenge I fully and completely forgot about unprotected lefts being a thing. So I'm adding those in now!

Step 7: Pedestrian Support
- Okay there are a few changes necessary for pedestrian support. I'm going to add in a walk symbol to each corner of the intersection but have there be some sorta arrow indicating the direction of travel since we don't have the benefit of 3d life to show which road on the corner is safe to walk on. I also am gonna add in a pedestrian for fun and to show that they have enough time to cross the street, I found a basic sprite on that same gaming website (which I will credit with some text on the page). At first I thought there wasn't enough time for the lil dude to cross the street but he seems fine. Though I think what's happened there is that there is the "smart" features so I will add in that the lights should not early move on or skip a light entirely if there is a pedestrian request in that direction. I also needed to update right turning cars to not run pedestrians over, though there was a fun little edge case in that cars take time to turn right. So I specifically said if a car has started turning right and a pedestrian walk sign goes on that the pedestrian should wait for the car to be out of their path before entering the road (which I ). I've also decided that pedestrians have to wait their turn to walk since that is my lived experience haha.

Step 8: Fixes
- when the pedestrian light is on do not turn left or right into one -- noticed a pedestrian getting clobbered by a car :3
- make the right and left lanes have a sorter solid white line before the intersection -- when I showed a friend what I was working on the had some nit picks about how roads should look so I adjusted the lines to be more accurate
- make the yellow lines a double yellow lines

Step 9: Review
- so I was reviewing the code after each step with claude but I want to do a full read through just to make sure everything is still making sense as a whole
- I also will send the code through a linter just to make sure everything is up to a standard
- Here I also had claude update its skill and claude file once more with the changes I made post-clearing to make sure that it's up to date in an eventuality I would need to make more changes (i.e. adding more features like city diagonal crosswalks or emergency vehicle all cars stop)

Okay well that was my process and I think I will call it here. This was a really fun challenge! And thanks for your consideration. And since I mentioned it several times I'll link my website with the frogger game on it so you don't have to dig around for it. https://makenzielarsen.github.io/kenziecodes/ is my website and the frogger game is under the game tab. Okay byeeeeee!
