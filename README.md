# Picture collection manipulator

How to use this CLI thingy:
- to run a command you need to prefix it with a `.`
- use `.help` to know all the commands
- use `.helpp {command}` to get help for a specific command

Picture manipulation relevant commands:
- `.move-to`: move tagged pictures to tag folders
- `.move-fro`: move pictures from tag folders to shared folders
- `.config`: the programme will use move-to and move-fro to move to a certain pre-set display config
  - Current available macros: 
    - meh (both meh and neh are shown)
    - neh (neh is showed, meh is hidden)
    - 0 (both meh and neh are hidden)
- You can supply an argument after either of these commands to specify pictures with what tag you want to move
- `.reset-tags`: [USE WITH CAUTION] will make sure that files in root folders have no tags and that files in tag folders have the tag that matches their folder.

## How to build exe
- Have pkg installed (`npm install -g pkg`)
- Run the "compile" npm script

## TODO
- Command to get number of files currently 'visisble'
- Make 'reset' command (clear tags outside of tag folders, make sure pictures in tag folders have the right tag)
- Add 'are you sure' thing to .reset