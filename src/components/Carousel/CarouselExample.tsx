import React from 'react'
import  { useCaoursel, CarouselProvider, CarouselSlide, CarouselRoot } from '.';

export function CarouselExample() {
  const {currentSlide, getToNextSlide, getToPrevSlide} = useCaoursel({total: 3});
  return (
    <>
      <CarouselProvider value={{currentSlide, total: 3}}>
        <CarouselRoot infinite>
          {Array.from({length: 3}).map((_, slide) => (
            <CarouselSlide key={slide}>
              Slide {slide}   
            </CarouselSlide>
          ))}
        </CarouselRoot>
      </CarouselProvider>
      <button onClick={getToPrevSlide}>
        Prev
      </button>
      <button onClick={getToNextSlide}>
        Next
      </button>
    </>
  )
}
