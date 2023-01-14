import { useEffect, useMemo, useRef, useState } from 'react';
import { ImTwitter, ImGithub } from 'react-icons/im';
import { data } from '../../lib/data'
import { convertTimeToSeconds } from '../../lib/utils/convertTime';
import { TrackWithIndex, MixWithIndex, } from '../../lib/types/track';
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';

export const getStaticPaths: GetStaticPaths = async () => {
    const paths = data.map((row, index) => ({
        params: {
            index: String(index + 1),
        }
    }));
    return { paths, fallback: false }
};

export const getStaticProps: GetStaticProps<{ pageIndex: number, data: MixWithIndex | null, audioLength: number }> = async ({ params, preview }) => {
    const pageIndex = Number(params?.index);
    const targetData = data.find((row, index) => index === pageIndex - 1);
    if (!targetData) {
        return {
            props: {
                pageIndex,
                audioLength: 0,
                data: null
            },
            redirect: {
                destination: '/404'
            }
        };
    } else {
        const audioLength = convertTimeToSeconds(targetData.time);
        const tracksWithIndex = targetData.tracks.map((track, index) => {
            const second = convertTimeToSeconds(track.time);
            return {
                ...track,
                index,
                second,
                seekRatio: second / audioLength
            }
        })
        return {
            props: {
                pageIndex,
                audioLength,
                data: {
                    ...targetData,
                    tracks: tracksWithIndex
                }
            }
        }
    }
}

const Index = ({ pageIndex, data, audioLength }: InferGetStaticPropsType<typeof getStaticProps>) => {
    const backgroudImageRef = useRef<HTMLImageElement | null>(null);
    const backgroudNextImageRef = useRef<HTMLImageElement | null>(null);
    const [currentSeekRatio, setCurrentSeekRatio] = useState(0);

    const { currentTrack, nextTrack } = useMemo(() => {
        if (!data) return {};
        let tracks: { currentTrack?: TrackWithIndex, nextTrack?: TrackWithIndex } = {
            currentTrack: data.tracks.length > 0 ? data.tracks[0] : undefined,
            nextTrack: data.tracks.length > 1 ? data.tracks[1] : undefined
        };
        data.tracks.forEach((track) => {
            if (track.second <= Math.ceil(audioLength * currentSeekRatio)) {
                tracks.currentTrack = track;
            }
        });
        if (tracks.currentTrack) {
            if (tracks.currentTrack.index <= data.tracks.length) {
                tracks.nextTrack = data.tracks[tracks.currentTrack.index + 1];
            }
        }
        return tracks;
    }, [currentSeekRatio, data, audioLength]);

    useEffect(() => {
        if (!backgroudImageRef.current || !backgroudNextImageRef.current) return;
        backgroudNextImageRef.current.src = currentTrack?.imageLink || '';
        backgroudImageRef.current.setAttribute('style', 'animation: fadeout 1s 1');
        backgroudNextImageRef.current.setAttribute('style', 'animation: fadein 1s 1');
        const timeout = setTimeout(() => {
            if (!backgroudImageRef.current || !backgroudNextImageRef.current) return;
            backgroudImageRef.current.src = currentTrack?.imageLink || '';
            backgroudNextImageRef.current.src = nextTrack?.imageLink || '';
            backgroudImageRef.current.setAttribute('style', 'animation: none');
            backgroudNextImageRef.current.setAttribute('style', 'animation: none');
        }, 1000);
        return () => {
            clearTimeout(timeout);
        }
    }, [currentTrack]);

    return (
        <div>
            <div className="w-full text-white min-h-screen overflow-hidden">
                <div className="z-[-4] bg-black absolute w-full h-full" />
                <div className="w-full overflow-hidden absolute z-[-2] h-[480px] ">
                    <img
                        className="w-full overflow-hidden brightness-75"
                        ref={backgroudImageRef}
                    />
                </div>
                <div className="w-full overflow-hidden absolute z-[-3] h-[480px]">
                    <img
                        className="overflow-hidden w-full brightness-75"
                        ref={backgroudNextImageRef}
                    />
                </div>
                <div className="h-[480px] bg-gradient-to-t from-black absolute w-full z-[-1] backdrop-blur-2xl" />
                <div className="px-4 lg:px-8 py-3 lg:py-6">
                    <div className="w-auto">
                        <h1 className="font-bold text-3xl lg:text-7xl tracking-tighter">
                            {data?.title}
                        </h1>
                        <div className="text-base lg:text-lg flex">
                            <div>
                                mixed by Revenant
                            </div>
                            <ImTwitter
                                className="h-auto my-auto ml-2 cursor-pointer"
                                onClick={() => {
                                    window.open('https://twitter.com/Re_venant', '_blank')
                                }}
                            />
                            <ImGithub
                                className="h-auto my-auto ml-2 cursor-pointer"
                                onClick={() => {
                                    window.open('https://github.com/yuki-oshima-revenant/mix-player', '_blank')
                                }}
                            />

                        </div>
                        <div className="flex mt-2 text-sm lg:text-base">
                            <div className="flex gap-1 lg:gap-2">
                                {data?.genres.map(({ name, color },) => (
                                    <div className={`px-2 font-medium`} key={name} style={{ backgroundColor: color }}>
                                        {name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-12">
                        <div className="mt-2 overflow-auto" style={{
                        }}>
                            <div className="grid grid-cols-12 gap-2 text-gray-400 p-2">
                                <div className="hidden lg:block lg:col-span-1 text-center">#</div>
                                <div className="col-span-10 lg:col-span-5 text-sm lg:text-base">Track</div>
                                <div className="hidden lg:block lg:col-span-5">Release</div>
                                <div className="col-span-2 lg:col-span-1 text-sm lg:text-base">Time</div>
                            </div>
                            <div className="grid flex-row">
                                {data?.tracks.map((track, id) => (
                                    <div className="grid grid-cols-12 gap-2 hover:bg-gray-500/30 rounded-lg p-2" key={`track_${id}`}>
                                        <div className="hidden lg:block lg:col-span-1 text-center h-auto my-auto cursor-pointer hover:underline"
                                        >
                                            {id + 1}
                                        </div>
                                        <div className="col-span-10 lg:col-span-5 flex">
                                            <img
                                                src={track.imageLink}
                                                className="w-10 h-10 lg:w-12 lg:h-12 my-auto object-contain shadow-lg cursor-pointer"
                                                onClick={() => {
                                                    window.open(track.link, "_blank", "noreferrer");
                                                }}
                                            />
                                            <div className="ml-4 h-auto my-auto truncate">
                                                <div
                                                    className="font-medium text-base lg:text-lg hover:underline cursor-pointer truncate"
                                                    onClick={() => {
                                                        window.open(track.link, "_blank", "noreferrer");
                                                    }}
                                                >
                                                    {track.title}
                                                </div>
                                                <div className="text-sm lg:text-base text-gray-300 truncate">
                                                    {track.artist}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="hidden lg:block lg:col-span-5">
                                            <div className="h-auto my-auto truncate">
                                                <div
                                                    className="font-medium text-base hover:underline cursor-pointer truncate"
                                                    onClick={() => {
                                                        window.open(track.link, "_blank", "noreferrer");
                                                    }}
                                                >
                                                    {track.release}
                                                </div>
                                                <div className="text-sm text-gray-300 truncate">
                                                    {track.label}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1 h-auto my-auto cursor-pointer hover:underline"
                                        >
                                            {track.time}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </div>
    );
};

export default Index;