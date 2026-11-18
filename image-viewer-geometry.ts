export type ImageSize = { width: number; height: number };
export type ImageTransform = { scale: number; x: number; y: number };
export const IMAGE_MAX_ZOOM = 4;

/** One successful horizontal gesture advances at most one page. */
export function galleryPageAfterDrag(index:number,count:number,width:number,offset:number,velocity:number,successful:boolean):number {
  'worklet';
  if(!successful||!Number.isFinite(width)||width<=0)return index;
  const direction=velocity<-350?-1:velocity>350?1:offset < -width*.2?-1:offset > width*.2?1:0;
  return Math.max(0,Math.min(Math.max(0,count-1),index-direction));
}

export function fitImage(image: ImageSize, viewport: ImageSize): ImageSize {
  'worklet';
  if (!(Number.isFinite(image.width) && Number.isFinite(image.height) && Number.isFinite(viewport.width) && Number.isFinite(viewport.height) && image.width > 0 && image.height > 0 && viewport.width > 0 && viewport.height > 0)) return { width: 0, height: 0 };
  const ratio = Math.min(viewport.width / image.width, viewport.height / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

export function boundImageTransform(transform: ImageTransform, fitted: ImageSize, viewport: ImageSize): ImageTransform {
  'worklet';
  const scale = Math.max(1, Math.min(IMAGE_MAX_ZOOM, Number.isFinite(transform.scale) ? transform.scale : 1));
  const maxX = Number.isFinite(fitted.width) && Number.isFinite(viewport.width) && fitted.width > 0 && viewport.width > 0
    ? Math.max(0, (fitted.width * scale - viewport.width) / 2) : 0;
  const maxY = Number.isFinite(fitted.height) && Number.isFinite(viewport.height) && fitted.height > 0 && viewport.height > 0
    ? Math.max(0, (fitted.height * scale - viewport.height) / 2) : 0;
  return { scale, x: Math.max(-maxX, Math.min(maxX, Number.isFinite(transform.x) ? transform.x : 0)),
    y: Math.max(-maxY, Math.min(maxY, Number.isFinite(transform.y) ? transform.y : 0)) };
}

/** Focal positions are relative to the centre of the viewport. */
export function zoomImageAt(start: ImageTransform, scale: number, from: {x:number;y:number}, to: {x:number;y:number}, fitted: ImageSize, viewport: ImageSize): ImageTransform {
  'worklet';
  const safeStart = boundImageTransform(start, fitted, viewport);
  const nextScale = Math.max(1, Math.min(IMAGE_MAX_ZOOM, Number.isFinite(scale) ? scale : safeStart.scale));
  const ratio = nextScale / safeStart.scale;
  return boundImageTransform({scale:nextScale, x:to.x-(from.x-safeStart.x)*ratio, y:to.y-(from.y-safeStart.y)*ratio}, fitted, viewport);
}
