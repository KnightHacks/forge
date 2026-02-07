# @forge/consts

The `consts` package is, obviously, where we store constant variables. Before you add to this, you must ask yourself: "does this need to be used between two separate apps". If the answer is yes, find a good place to put it. If the answer is no, then we probably don't want to put it here.

Some types of data kind of go against this would be, for example, a named Discord channel that we need to remember. Storing it at the top of the file that it is used in makes no sense. Just some food for thought.

Note: please do not use `misc.ts`. This is a placeholder until we can migrate the rest. Thanks for understanding.
