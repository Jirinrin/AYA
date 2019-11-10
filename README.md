# Picture collection manipulator

How to use this CLI thingy:
- to run a command you need to prefix it with a `.`
- use `.help` to know all the commands
- use `.helpp {command}` to get help for a specific command

Picture manipulation relevant commands:
- `.move-to`: move tagged pictures to tag folders
- `.move-fro`: move pictures from tag folders to shared folders
- You can supply an argument after either of these commands to specify pictures with what tag you want to move

## How to build exe
- Have pkg installed (`npm install -g pkg`)
- Run the "compile" npm script

## TODO
- Make 'aliases' for e.g. meh+neh
- Command to get number of files currently 'visisble'
- Make 'reset' command (clear tags outside of tag folders, make sure pictures in tag folders have the right tag)