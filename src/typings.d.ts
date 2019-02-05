

/***********************************************
 * Add Omit type support (needed for typescript < 2.8)
 * taken from https://stackoverflow.com/a/48216010
 ***********************************************/
declare type Diff<T extends string, U extends string> = ({[P in T]: P } & {[P in U]: never } & { [x: string]: never })[T]
declare type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>
