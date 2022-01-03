export type Track = {
    artist: string,
    title: string,
    release: string,
    label: string,
    link: string,
    time: string,
    imageLink: string,

}

export type TrackWithIndex = {
    index: number,
    second: number,
    seekRatio: number
} & Track;