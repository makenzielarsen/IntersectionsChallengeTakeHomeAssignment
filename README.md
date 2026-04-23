Okay! Hello to the reader! I'm Makenzie. I am gonna keep these notes fairly casual but if you're looking for a condensed version I'll include bullet highlights for the big things. I have decided to take on the INTERSECTION challenge. My first thought is that I want to overengineer this and make a whole simulation similar to the frogger game I made in school (it's on my website if you wanna try it out), but that is most likely too much so I'll try to not overengineer it. Okay so first thing I wanna do here is break up the challenge into bite size chunks to help with the overwhelm of a whole problem. We wanna make a simulation of a intersection with cars able to travel in the usual four way light directions as well as some interactive capabilities with the pedestrian crosswalk buttons.


Step 1: Make One Light that changes color on a timer

Step 2: Replicate so that there are 12 lights total (left, straight 1, staight 2 for each of the 4 sides). Functionality hooked together

Loop Details:
North/South Left Protected Turns (2 Lights Green at the same time)
North/South Straight Lanes (4 Lights Green at the same time)
East/West Left Protected Turns (2 Lights Green at the same time)
East/West Straight Lanes (4 Lights Green at the same time)

Step 3: Arrange lights into intersection pattern

Step 4: Add cars moving through the intersection while a light is green. Cars arriving should be randomized.

Step 5: Edge cases

Step 6: Blinking Orange Light - Unprotected Left turns

Step 7: Pedestrian Support

Step 8: Fixes


- Add support for a "walk" button at each intersection. When the button is pressed, it should cause the intersection to become clear long enough for a person to walk through it.
