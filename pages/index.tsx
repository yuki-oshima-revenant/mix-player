import type { NextPage } from 'next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
} from '@chakra-ui/react'
import { ImPlay2, ImPause, ImVolumeHigh } from 'react-icons/im';
import { data } from '../lib/data'
import { convertSecondsToTime, convertTimeToSeconds } from '../lib/utils/convertTime';
import { TrackWithIndex } from '../lib/types/track';

const Home: NextPage = () => {
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
    const [audioLength, setAudioLength] = useState(0);
    const [seekbarPointerPosition, setSeekbarPointerPosition] = useState(0);
    const seekbarRef = useRef<HTMLDivElement>(null);
    const seekbarPointerHolded = useRef(false);
    const [seekbarPointerVisible, setSeekbarPointerVisible] = useState(false);

    const trackWithSeconds = useMemo(() => {
        return data[0].tracks.map((track, index) => {
            const second = convertTimeToSeconds(track.time);
            return {
                ...track,
                index,
                second,
                seekRatio: second / audioLength
            }
        })
    }, [audioLength]);

    const { currentTrack, nextTrack } = useMemo(() => {
        let tracks: { currentTrack?: TrackWithIndex, nextTrack?: TrackWithIndex } = {
            currentTrack: trackWithSeconds.length > 0 ? trackWithSeconds[0] : undefined,
            nextTrack: trackWithSeconds.length > 1 ? trackWithSeconds[1] : undefined
        };
        trackWithSeconds.forEach((track) => {
            if (track.second <= Math.ceil(audioLength * currentSeekRatio)) {
                tracks.currentTrack = track;
            }
        });
        if (tracks.currentTrack) {
            if (tracks.currentTrack.index <= trackWithSeconds.length) {
                tracks.nextTrack = trackWithSeconds[tracks.currentTrack.index + 1];
            }
        }
        return tracks;
    }, [currentSeekRatio, trackWithSeconds, audioLength]);

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
        const seekbarPointerMousemoveEvent = (e: MouseEvent) => {
            if (seekbarPointerHolded.current) {
                const rect = seekbarRef.current?.getBoundingClientRect();
                if (rect) {
                    if (e.pageX >= (rect.x - 12) && (e.pageX <= (rect.width + rect.x - 12))) {
                        setSeekbarPointerPosition(e.pageX - 24);
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
                    const width = rect?.right - rect?.left;
                    setSeekPosition(offset / width);
                }
            }
            seekbarPointerHolded.current = false;
        }
        window.addEventListener('mouseup', seekbarMouseupEvent);
        audioContext.current = new window.AudioContext();
        if (audioElement.current && audioContext.current) {
            const currentAudioElement = audioElement.current;
            if (!audioSourceNode.current) {
                audioSourceNode.current = audioContext.current.createMediaElementSource(currentAudioElement);
                setAudioLength(Math.floor(audioSourceNode.current.mediaElement.duration));
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
                window.removeEventListener('mouseup', seekbarMouseupEvent);
                window.removeEventListener('mousemove', seekbarPointerMousemoveEvent);
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
        <div className="w-full text-white min-h-screen">
            <audio src='/mix/1.mp3' ref={audioElement} />
            <div className="z-[-4] bg-black absolute w-full h-full" />
            <div className="w-full overflow-hidden absolute z-[-2] h-[560px] ">
                <img
                    className="w-full overflow-hidden brightness-75"
                    ref={backgroudImageRef}
                />
            </div>
            <div className="w-full overflow-hidden absolute z-[-3] h-[560px] ">
                <img
                    className="overflow-hidden w-full brightness-75"
                    ref={backgroudNextImageRef}
                />
            </div>
            <div className="h-[560px] bg-gradient-to-t from-black absolute w-full z-[-1] backdrop-blur-lg" />
            <div className="px-8 py-4">
                <div className="w-auto">
                    <div className="font-bold text-8xl tracking-tight">
                        eleventh-floor 0.0.1
                    </div>
                    <div>mixed by Revenant</div>
                    <div className="flex mt-2">
                        <div>
                            Genre
                        </div>
                        <div className="ml-2 flex gap-2">
                            <div className="bg-indigo-500 text-white px-2 font-bold">
                                Techno
                            </div>
                            <div className="bg-pink-500 text-white px-2 font-bold">
                                House
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid mt-10 grid-cols-3 gap-8 h-60">
                    <div className=" col-span-1 flex justify-center">
                        <div className="h-auto my-auto">
                            <div className="flex justify-center">
                                <button
                                    className="w-32 h-32 my-auto"
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
                            <div className="flex mt-4 justify-center">
                                <button
                                    className="w-6 h-6 my-auto"
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
                                    h="4"
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
                    <div className="relative col-span-2">
                        <div className="bg-gray-500/20 p-6 rounded-lg z-[2] h-full">
                            <div className="text-xl">Playing</div>
                            <div className="flex tracking-tight w-auto mt-2 min-w-0">
                                <img
                                    src={currentTrack?.imageLink} className="w-36 shadow-lg cursor-pointer"
                                    onClick={() => {
                                        window.open(currentTrack?.link, "_blank", "noreferrer");
                                    }} />
                                <div className="h-auto mb-auto ml-4 min-w-0">
                                    <div className="font-bold text-5xl h-14 truncate cursor-pointer"
                                        onClick={() => {
                                            window.open(currentTrack?.link, "_blank", "noreferrer");
                                        }}
                                    >
                                        {currentTrack?.title}
                                    </div>
                                    <div className="font-medium text-3xl mt-2 truncate">
                                        {currentTrack?.artist}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <canvas ref={oscilloscopeRef} className="absolute w-full top-0 z-[-1] h-60" />
                    </div>
                </div>
                <div className="text-xl mt-6 text-right">
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
                        className="absolute left-8 right-8 z-[-1] h-4 bg-gray-400/30 rounded-full"
                    />
                    <div
                        className="w-6 h-6 absolute rounded-full z-[2] bg-white cursor-pointer"
                        style={{
                            top: seekbarRef.current ? seekbarRef.current.offsetTop - 3 : undefined,
                            left: seekbarPointerPosition + 24,
                            display: seekbarPointerVisible ? undefined : 'none'
                        }}
                        onDragStart={(e) => {
                            e.preventDefault();
                        }}
                        onMouseDown={() => {
                            seekbarPointerHolded.current = true;
                        }}
                    />
                    <div className="absolute left-8 right-8">
                        {trackWithSeconds.map((track, index) => {
                            if (index === 0) return;
                            return <div
                                className="absolute h-4 w-[2px] bg-white z-[1] cursor-pointer"
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
                        className="flex-grow h-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 my-auto rounded-full cursor-pointer bg-no-repeat"
                        style={{ backgroundSize: `${currentSeekRatio * 100}%` }}
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
                <div className="mt-10">
                    <div className="grid grid-cols-12 text-gray-400">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-5">Track</div>
                        <div className="col-span-5">Release</div>
                        <div className="col-span-1">Time</div>
                    </div>
                    <div className="mt-2 overflow-auto" style={{ height: 'calc(100vh - 560px - 32px - 32px)' }}>
                        <div className="grid flex-row gap-4">
                            {trackWithSeconds.map((track, id) => (
                                <div className="grid grid-cols-12" key={`track_${id}`}>
                                    <div className="col-span-1 text-center h-auto my-auto cursor-pointer hover:underline"
                                        onClick={() => {
                                            setSeekPosition(track.seekRatio)
                                        }}
                                    >
                                        {id + 1}
                                    </div>
                                    <div className="col-span-5 flex">
                                        <img
                                            src={track.imageLink}
                                            className="w-12 h-12 shadow-lg cursor-pointer"
                                            onClick={() => {
                                                window.open(track.link, "_blank", "noreferrer");
                                            }}
                                        />
                                        <div className="ml-4 h-auto my-auto">
                                            <div
                                                className="font-bold text-xl hover:underline cursor-pointer"
                                                onClick={() => {
                                                    window.open(track.link, "_blank", "noreferrer");
                                                }}
                                            >
                                                {track.title}
                                            </div>
                                            <div className="text-md">
                                                {track.artist}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-5 flex">
                                        <div className="h-auto my-auto">
                                            <div
                                                className="font-bold hover:underline cursor-pointer"
                                                onClick={() => {
                                                    window.open(track.link, "_blank", "noreferrer");
                                                }}
                                            >
                                                {track.release}
                                            </div>
                                            <div className="text-sm">
                                                {track.label}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-1 h-auto my-auto cursor-pointer hover:underline"
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

export default Home
