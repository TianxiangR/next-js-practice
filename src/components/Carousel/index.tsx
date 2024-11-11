import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import './Carousel.scss';
import { usePrevious } from '@/hooks/usePrevious';

// export function Carousel() {
//   const [currentSlide, setCurrentSlide] = useState(0);
//   const containerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!containerRef.current) return;

//     containerRef.current.style.transform = `translateX(${-currentSlide * 100}%)`;
//   }, [currentSlide]);


//   return (
//     <>
//     <div className="carousel">
//       <div className="carousel__container" ref={containerRef}>
//         <div className="carousel__slide">Slide 1</div>
//         <div className="carousel__slide">Slide 2</div>
//         <div className="carousel__slide">Slide 3</div>
//       </div>
//     </div>
//     <button onClick={() => setCurrentSlide(currentSlide - 1)}>
//       Prev
//     </button>
//     <button onClick={() => setCurrentSlide(currentSlide + 1)}>
//       Next
//     </button>
//     </>
//   )
// }

export interface ICourselContext {
  currentSlide: number;
  getToNextSlide: () => void;
  getToPrevSlide: () => void;
}

export const CarouselContext = createContext({} as Pick<ICourselContext, 'currentSlide'> & {total: number});

export const CarouselProvider = CarouselContext.Provider;

export function useCaoursel({total}: {total: number}): ICourselContext {
  const [currentSlide, setCurrentSlide] = useState(0);
  const getToNextSlide = useCallback(() => setCurrentSlide((prev) => {
    if (prev === total - 1) return 0;
    return prev + 1;
  }
  ), [total]);
  const getToPrevSlide = useCallback(() => setCurrentSlide((prev) => {
    if (prev === 0) return total - 1;
    return prev - 1;
  }), [total]);

  return {
    currentSlide,
    getToNextSlide,
    getToPrevSlide,
  }
}

export interface CarouselProps {
  children: React.ReactNode;
  infinite?: boolean;
}

export function CarouselRoot({ children, infinite }: CarouselProps) {
  const {currentSlide, total} = useContext(CarouselContext);
  const lastSlide = usePrevious(currentSlide);
  const viewportRef = useRef<HTMLDivElement>(null);
  const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    if (!viewportRef.current) return;
    if (infinite && currentSlide === 0 && lastSlide === total - 1) {
      viewportRef.current.style.transition = 'none';
      viewportRef.current.style.transform = `translateX(100%)`;
      viewportRef.current.getBoundingClientRect();
      viewportRef.current.style.transition = '';
    } else if (infinite && currentSlide === total - 1 && lastSlide === 0) {
      viewportRef.current.style.transition = 'none';
      viewportRef.current.style.transform = `translateX(${-(total) * 100}%)`;
      viewportRef.current.getBoundingClientRect();
      viewportRef.current.style.transition = '';
    }
    viewportRef.current.style.transform = `translateX(${-currentSlide * 100}%)`;
  }, [currentSlide, total, lastSlide, infinite]);

  const renderedChildren = useMemo(() => {
    if (!infinite) return childrenArray;
    if (childrenArray.length === 0) return null;

    // override the keys to make sure every child has a unique key
    const firstChild = React.cloneElement(childrenArray[0] as React.ReactElement, {key: -1});
    const lastChild = React.cloneElement(childrenArray[childrenArray.length - 1] as React.ReactElement, {key: childrenArray.length});
    const childrenArrayWithKeys = childrenArray.map((child, index) => React.cloneElement(child as React.ReactElement, {key: index}));
    return [lastChild, ...childrenArrayWithKeys, firstChild];
  }, [childrenArray, infinite]);

  return (
    <div className="carousel">
      <div className={`carousel__viewport ${infinite ? 'infinite' : ''}`} ref={viewportRef}>
        {renderedChildren}
      </div>
    </div>
  );
}

export interface SlideProps {
  children: React.ReactNode;
}

export function CarouselSlide({ children }: SlideProps) {
  return <div className="carousel__slide">{children}</div>;
}
