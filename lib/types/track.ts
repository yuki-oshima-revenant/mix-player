type MixBase = {

    title: string,
    time: string,
    genres: {
        name: string,
        color: string
    }[],
}

export type Mix = MixBase & {
    tracks: Track[]
}

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


export type MixWithIndex = MixBase & {
    tracks: TrackWithIndex[]
};