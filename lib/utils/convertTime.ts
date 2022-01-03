export const convertSecondsToTime = (second: number) => {
    if (Number.isNaN(second)) {
        return '00:00';
    }
    return `${('00' + Math.floor(second / 60)).slice(-2)}:${('00' + Math.fround(second % 60)).slice(-2)}`
}

export const convertTimeToSeconds = (time: string) => {
    const [minutes, seconds] = time.split(':');
    return Number(minutes) * 60 + Number(seconds);
}