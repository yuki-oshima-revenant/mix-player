import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
} from '@chakra-ui/react'
import { ImPlay2, ImPause, ImVolumeHigh } from 'react-icons/im';
import { data } from '../../lib/data'
import { convertSecondsToTime, convertTimeToSeconds } from '../../lib/utils/convertTime';
import { TrackWithIndex, MixWithIndex } from '../../lib/types/track';
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
    const audioElement = useRef<HTMLAudioElement | null>(null);
    const audioContext = useRef<AudioContext>();
    const audioSourceNode = useRef<MediaElementAudioSourceNode>();
    const gainNode = useRef<GainNode>();
    const analyserNode = useRef<AnalyserNode>();
    const backgroudImageRef = useRef<HTMLImageElement | null>(null);
    const backgroudNextImageRef = useRef<HTMLImageElement | null>(null);
    const oscilloscopeRef = useRef<HTMLCanvasElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [gain, setGain] = useState(100);
    const [currentSeekRatio, setCurrentSeekRatio] = useState(0);
    const [seekbarPointerPosition, setSeekbarPointerPosition] = useState(0);
    const seekbarRef = useRef<HTMLDivElement>(null);
    const seekbarPointerHolded = useRef(false);
    const [seekbarPointerVisible, setSeekbarPointerVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }

        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

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

    const togglePlay = useCallback(() => {
        if (audioContext.current?.state === 'suspended') {
            audioContext.current.resume();
        }
        if (audioElement.current) {
            if (!playing) {
                audioElement.current.play();
                setPlaying(true);
            } else {
                audioElement.current.pause();
                setPlaying(false);
            }
        }
    }, [playing]);

    const setSeekPosition = useCallback((seekRatio: number) => {
        if (audioSourceNode.current) {
            setCurrentSeekRatio(seekRatio);
            audioSourceNode.current.mediaElement.currentTime = audioSourceNode.current.mediaElement.duration * seekRatio;
        }
    }, [])

    useEffect(() => {
        const spaceStartStopEvent = (e: KeyboardEvent) => {
            if (e.key === 'Space') {
                togglePlay();
            }
        }
        window.addEventListener('keypress', spaceStartStopEvent);
        return () => {
            window.removeEventListener('keypress', spaceStartStopEvent);
        }
    }, [togglePlay]);

    useEffect(() => {
        const margin = isMobile ? 12 : 24;
        const seekbarPointerMousemoveEvent = (e: MouseEvent) => {
            if (seekbarPointerHolded.current) {
                const rect = seekbarRef.current?.getBoundingClientRect();
                if (rect) {
                    if (e.pageX >= (rect.x - margin / 2) && (e.pageX <= (rect.width + rect.x - margin / 2))) {
                        setSeekbarPointerPosition(e.pageX - margin);
                    }
                }
            }
        }
        window.addEventListener('mousemove', seekbarPointerMousemoveEvent);
        const seekbarMouseupEvent = (e: MouseEvent) => {
            if (seekbarPointerHolded.current) {
                const mouse = e.pageX;
                const rect = seekbarRef.current?.getBoundingClientRect();
                if (rect) {
                    const position = rect.left + window.pageXOffset;
                    const offset = mouse - position;
                    setSeekPosition(offset / rect.width);
                }
            }
            seekbarPointerHolded.current = false;
        }
        window.addEventListener('mouseup', seekbarMouseupEvent);
        return () => {
            window.removeEventListener('mouseup', seekbarMouseupEvent);
            window.removeEventListener('mousemove', seekbarPointerMousemoveEvent);
        };
    }, [])

    useEffect(() => {
        audioContext.current = new window.AudioContext();
        if (audioElement.current && audioContext.current) {
            const currentAudioElement = audioElement.current;
            if (!audioSourceNode.current) {
                audioSourceNode.current = audioContext.current.createMediaElementSource(currentAudioElement);
                gainNode.current = audioContext.current.createGain();
                analyserNode.current = audioContext.current.createAnalyser();
                audioSourceNode.current
                    .connect(gainNode.current)
                    .connect(analyserNode.current)
                    .connect(audioContext.current.destination);
            }
            const seekInterval = setInterval(() => {
                if (audioSourceNode.current) {
                    setCurrentSeekRatio((audioSourceNode.current.mediaElement.currentTime / audioSourceNode.current.mediaElement.duration));
                }
                if (oscilloscopeRef.current && analyserNode.current) {
                    const canvasCtx = oscilloscopeRef.current.getContext("2d");
                    if (canvasCtx) {
                        const WIDTH = oscilloscopeRef.current.width;
                        const HEIGHT = oscilloscopeRef.current.height;
                        analyserNode.current.fftSize = 2048;
                        const bufferLength = analyserNode.current.fftSize;
                        const dataArray = new Uint8Array(bufferLength);
                        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
                        const draw = () => {
                            if (oscilloscopeRef.current && analyserNode.current) {
                                analyserNode.current.getByteTimeDomainData(dataArray);
                                canvasCtx.fillStyle = 'transparent';
                                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
                                canvasCtx.lineWidth = 1;
                                canvasCtx.strokeStyle = '#4b5563';
                                canvasCtx.beginPath();
                                var sliceWidth = WIDTH * 1.0 / bufferLength;
                                var x = 0;
                                for (var i = 0; i < bufferLength; i++) {
                                    var v = dataArray[i] / 128.0;
                                    var y = v * HEIGHT / 2;
                                    if (i === 0) {
                                        canvasCtx.moveTo(x, y);
                                    } else {
                                        canvasCtx.lineTo(x, y);
                                    }
                                    x += sliceWidth;
                                }
                                canvasCtx.lineTo(oscilloscopeRef.current.width, oscilloscopeRef.current.height / 2);
                                canvasCtx.stroke();
                            }
                        };
                        draw();
                    }
                }
            }, 25);
            const onEnd = () => { setPlaying(false); };
            audioElement.current.addEventListener('ended', onEnd);
            return () => {
                clearInterval(seekInterval);
                currentAudioElement.removeEventListener('ended', onEnd);
            };
        }
    }, []);

    useEffect(() => {
        if (seekbarPointerHolded.current) return;
        setSeekbarPointerPosition(currentSeekRatio * (seekbarRef.current?.getBoundingClientRect().width || 0));
    }, [currentSeekRatio]);

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
        <div className="w-full text-white min-h-screen overflow-hidden">
            <audio src={process.env.NODE_ENV === 'development'
                ? `/mix/${pageIndex}.mp3`
                : `https://delivery.unronritaro.net/mix/${pageIndex}.mp3`}
                ref={audioElement}
                crossOrigin="anonymous"
            />
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
            <div className="px-4 md:px-8 py-4">
                <div className="w-auto">
                    <h1 className="font-bold text-4xl md:text-8xl tracking-tighter">
                        {data?.title}
                    </h1>
                    <div className="text-sm md:text-base">mixed by Revenant</div>
                    <div className="flex mt-2 text-sm md:text-base">
                        <div>
                            Genre
                        </div>
                        <div className="ml-2 flex gap-2">
                            {data?.genres.map(({ name, color },) => (
                                <div className={`px-2 font-medium`} key={name} style={{ backgroundColor: color }}>
                                    {name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="grid mt-8 md:mt-10 grid-cols-3 gap-4 md:gap-8 h-64 md:h-48">
                    <div className="col-span-3 md:col-span-1 flex justify-center">
                        <div className="h-auto my-auto">
                            <div className="flex justify-center">
                                <button
                                    className="w-20 h-20 md:w-32 md:h-32 my-auto"
                                    onClick={() => {
                                        togglePlay();
                                    }}
                                >
                                    {playing
                                        ? <ImPause className="w-full h-full" />
                                        : <ImPlay2 className="w-full h-full" />
                                    }
                                </button>
                            </div>
                            <div className="flex mt-2 md:mt-4 justify-center">
                                <button
                                    className="w-5 h-5 md:w-6 md:h-6 my-auto"
                                >
                                    <ImVolumeHigh className="w-full h-full" />
                                </button>
                                <Slider
                                    title='gain'
                                    value={gain}
                                    min={0}
                                    max={100}
                                    ml={4}
                                    my="auto"
                                    h={{ 'xs': 2, 'md': 4 }}
                                    colorScheme="gray"
                                    w={240}
                                    onChange={(value) => {
                                        setGain(value);
                                        if (gainNode.current) {
                                            gainNode.current.gain.value = (value / 100);
                                        }
                                    }}>
                                    <SliderTrack>
                                        <SliderFilledTrack />
                                    </SliderTrack>
                                    <SliderThumb />
                                </Slider>
                            </div>
                        </div>
                    </div>
                    <div className="relative col-span-3 md:col-span-2">
                        <div className="bg-gray-500/20 p-3 md:p-6 rounded-lg z-[2] h-full">
                            {/* <div className="text-xl">Playing</div> */}
                            <div className="flex tracking-tight w-auto min-w-0">
                                <img
                                    src={currentTrack?.imageLink} className="w-24 md:w-36 shadow-lg cursor-pointer object-contain"
                                    onClick={() => {
                                        window.open(currentTrack?.link, "_blank", "noreferrer");
                                    }} />
                                <div className="h-auto mb-auto ml-4 min-w-0">
                                    <div className="font-medium text-2xl md:text-5xl h-8 md:h-14 truncate cursor-pointer tracking-tight"
                                        onClick={() => {
                                            window.open(currentTrack?.link, "_blank", "noreferrer");
                                        }}
                                    >
                                        {currentTrack?.title}
                                    </div>
                                    <div className="text-xl md:text-3xl mt-2 truncate tracking-tight text-gray-300">
                                        {currentTrack?.artist}
                                    </div>
                                    <div className="mt-2 md:mt-4 text-gray-300 tracking-tight truncate">
                                        <span className="mr-2 text-ms leading-6 md:text-base md:leading-7">
                                            from
                                        </span>
                                        <span
                                            className="text-base md:text-lg cursor-pointer"
                                            onClick={() => {
                                                window.open(currentTrack?.link, "_blank", "noreferrer");
                                            }}
                                        >
                                            {`${currentTrack?.label} - ${currentTrack?.release}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <canvas ref={oscilloscopeRef} className="absolute w-full top-0 z-[-1] h-[120px] md:h-48" />
                    </div>
                </div>
                <div className="text-base md:text-xl mt-4 md:mt-6 text-right">
                    <span>
                        {convertSecondsToTime(Math.floor(audioLength * currentSeekRatio))}

                    </span>
                    <span className="mx-1">
                        /
                    </span>
                    <span>
                        {convertSecondsToTime(audioLength)}
                    </span>
                </div>
                <div className="mt-2"
                    onMouseEnter={() => {
                        setSeekbarPointerVisible(true);
                    }}
                    onMouseLeave={() => {
                        setSeekbarPointerVisible(false);
                    }}>
                    <div
                        className="absolute left-4 right-4 md:left-8 md:right-8 z-[-1] h-4 bg-gray-400/30 rounded-full"
                    />
                    <div
                        className="w-6 h-6 absolute rounded-full z-[2] bg-white cursor-pointer"
                        style={{
                            top: seekbarRef.current ? seekbarRef.current.offsetTop - 3 : undefined,
                            left: isMobile ? seekbarPointerPosition + 12 : seekbarPointerPosition + 24,
                            display: seekbarPointerVisible ? undefined : 'none'
                        }}
                        onDragStart={(e) => {
                            e.preventDefault();
                        }}
                        onMouseDown={() => {
                            seekbarPointerHolded.current = true;
                        }}
                    />
                    <div className="absolute left-4 right-4 md:left-8 md:right-8">
                        {data?.tracks.map((track, index) => {
                            if (index === 0) return;
                            return <div
                                className="absolute h-4 w-[2px] bg-gray-200/50 z-[1] cursor-pointer"
                                style={{ left: `calc(${track.seekRatio * 100}%)` }}
                                key={`position_${index}`}
                                onClick={() => {
                                    setSeekPosition(track.seekRatio);
                                }}
                            />
                        })}
                    </div>
                    <div
                        ref={seekbarRef}
                        className="flex-grow h-4 bg-gradient-to-r from-indigo-500 to-purple-500 my-auto rounded-full cursor-pointer bg-no-repeat"
                        style={{ backgroundSize: `${currentSeekRatio * 100}% 100%` }}
                        onMouseUp={(e) => {
                            const mouse = e.pageX;
                            const rect = seekbarRef.current?.getBoundingClientRect();
                            if (rect) {
                                const position = rect.left + window.pageXOffset;
                                const offset = mouse - position;
                                const width = rect?.right - rect?.left;
                                setSeekPosition(offset / width);
                            }
                        }}
                    />
                </div>
                <div className="mt-6 md:mt-10">
                    <div className="grid grid-cols-12 gap-2 text-gray-400 px-2">
                        <div className="hidden md:col-span-1 text-center">#</div>
                        <div className="col-span-10 md:col-span-5">Track</div>
                        <div className="hidden md:col-span-5">Release</div>
                        <div className="col-span-2 md:col-span-1">Time</div>
                    </div>
                    <div className="mt-2 overflow-auto" style={{
                        height: isMobile
                            ? 'calc(100vh - 480px - 24px - 24px - 16px)'
                            : 'calc(100vh - 480px - 32px - 40px - 24px)'
                    }}>
                        <div className="grid flex-row">
                            {data?.tracks.map((track, id) => (
                                <div className="grid grid-cols-12 gap-2 hover:bg-gray-500/30 rounded-lg p-2" key={`track_${id}`}>
                                    <div className="hidden md:col-span-1 text-center h-auto my-auto cursor-pointer hover:underline"
                                        onClick={() => {
                                            setSeekPosition(track.seekRatio)
                                        }}
                                    >
                                        {id + 1}
                                    </div>
                                    <div className="col-span-10 md:col-span-5 flex">
                                        <img
                                            src={track.imageLink}
                                            className="w-12 h-12 my-auto object-contain shadow-lg cursor-pointer"
                                            onClick={() => {
                                                window.open(track.link, "_blank", "noreferrer");
                                            }}
                                        />
                                        <div className="ml-4 h-auto my-auto truncate">
                                            <div
                                                className="font-medium text-base md:text-lg hover:underline cursor-pointer"
                                                onClick={() => {
                                                    window.open(track.link, "_blank", "noreferrer");
                                                }}
                                            >
                                                {track.title}
                                            </div>
                                            <div className="text-sm md:text-base text-gray-300">
                                                {track.artist}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:col-span-5 md:flex">
                                        <div className="h-auto my-auto">
                                            <div
                                                className="font-medium text-base hover:underline cursor-pointer"
                                                onClick={() => {
                                                    window.open(track.link, "_blank", "noreferrer");
                                                }}
                                            >
                                                {track.release}
                                            </div>
                                            <div className="text-sm text-gray-300">
                                                {track.label}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 md:col-span-1 h-auto my-auto cursor-pointer hover:underline"
                                        onClick={() => {
                                            setSeekPosition(track.seekRatio);
                                        }}
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
    );
};

export default Index;
