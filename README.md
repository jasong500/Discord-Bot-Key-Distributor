# Discord-Bot-Key-Distributor
This is a discord bot made specifically for distributing keys to people.

This bot was made with the intention of having an easy way to hand out beta codes for testing a game. The bot will keep track of who got what key via Discord IDs and prevent people from getting more than one key. It will also move keys from the original key file to a new one called "DeactivateKeys.txt" so that you can just hand that text file off to Steam or Epic or wherever your game is being hosted to deactivate said keys if needed. 

Commands:
?startkeys - bot will post it's default message and have an interaction button beneath it that will distribute codes via ephemeral message when clicked.
?stopkeys - bot will stop handing out keys and if someone clicks the button it will tell them that testing has ended and no keys are being distributed right now.
give me a code - bot will DM you a new key (if there are keys available) even if you already have a key.
