import { useEffect, useState } from "react";

export const useWindowSize = () => {
    const [width, setWidth] = useState<number>();
    const [height, setHeight] = useState<number>();
    const [isMobile, setIsMobile] = useState(true);
    useEffect(() => {
        const handleResize = () => {
            const { width, height } = document.body.getBoundingClientRect();
            setWidth(width);
            setHeight(height);
            setIsMobile(window.innerWidth < 1024);
        }
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return { width, height, isMobile };
}