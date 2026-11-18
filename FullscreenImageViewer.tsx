import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, Modal, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useI18n } from '../i18n';
import { getEntryCopy } from '../screens/entry/entry-copy';
import { ChromeBackButton } from './ChromeBackButton';
import { usePhoneChrome } from './usePhoneChrome';
import { boundImageTransform, fitImage, galleryPageAfterDrag, zoomImageAt, type ImageSize } from './image-viewer-geometry';

export type ImageViewerItem = ({uri:string;source?:never;content?:never} |
  {source:ImageSourcePropType;uri?:never;content?:never} |
  {content:ReactNode;naturalSize:ImageSize;uri?:never;source?:never}) & {
    id?:string; accessibilityLabel?:string; naturalSize?:ImageSize;
  };
export type ImageViewerRequest = (ImageViewerItem & {gallery?:never;initialIndex?:never;onIndexChange?:never} |
  {gallery:readonly ImageViewerItem[];initialIndex?:number;onIndexChange?(index:number):void;uri?:never;source?:never;content?:never;naturalSize?:never;accessibilityLabel?:never}) & {onClose?():void};
type ViewerContextValue = {open(request:ImageViewerRequest):()=>void;close():void;visible:boolean};
const ViewerContext = createContext<ViewerContextValue | null>(null);

export function useImageViewer():ViewerContextValue {
  const value=useContext(ViewerContext);
  if(!value)throw new Error('ImageViewerProvider is missing');
  return value;
}

function snapshotItem(item:ImageViewerItem):ImageViewerItem {
  const snapshot={...item};
  if(item.naturalSize)snapshot.naturalSize={...item.naturalSize};
  if(item.source&&typeof item.source==='object')snapshot.source=Array.isArray(item.source)
    ?item.source.map(source=>({...source})):{...item.source};
  return snapshot;
}

/** One native modal outside scaled route frames; callers own image/cache resolution. */
export function ImageViewerProvider({children}:{children:ReactNode}) {
  const [shown,setShown]=useState<{id:number;request:ImageViewerRequest}|null>(null);
  const current=useRef<typeof shown>(null);const sequence=useRef(0);
  const dismiss=useCallback((id:number|undefined,notify:boolean)=>{
    const previous=current.current;if(!previous||id!==undefined&&previous.id!==id)return;
    current.current=null;setShown(null);if(notify)previous.request.onClose?.();
  },[]);
  const close=useCallback(()=>dismiss(undefined,true),[dismiss]);
  const open=useCallback((request:ImageViewerRequest)=>{
    if(request.gallery&&!request.gallery.length)return()=>{};
    dismiss(undefined,true);
    const snapshot:ImageViewerRequest=request.gallery?{...request,gallery:request.gallery.map(snapshotItem)}:{...snapshotItem(request),onClose:request.onClose};
    const next={id:++sequence.current,request:snapshot};current.current=next;setShown(next);
    const onIndexChange=request.onIndexChange;
    if(request.gallery)snapshot.onIndexChange=index=>{if(current.current?.id===next.id)onIndexChange?.(index);};
    return()=>dismiss(next.id,false);
  },[dismiss]);
  return <ViewerContext.Provider value={{open,close,visible:Boolean(shown)}}>
    {children}
    {shown?<FullscreenImageViewer key={shown.id} request={shown.request} onClose={()=>dismiss(shown.id,true)}/>:null}
  </ViewerContext.Provider>;
}

function FullscreenImageViewer({request,onClose}:{request:ImageViewerRequest;onClose():void}) {
  const {locale}=useI18n();const {width,height,scale:chromeScale,chromeTop}=usePhoneChrome();
  const items=request.gallery??[request as ImageViewerItem];
  const pageCount=items.length;
  const initial=Math.max(0,Math.min(items.length-1,Math.trunc(request.initialIndex??0)||0));
  const [index,setIndex]=useState(initial);
  const [sizes,setSizes]=useState<Record<number,ImageSize>>({});
  const [viewport,setViewport]=useState<ImageSize>({width:0,height:0});
  const natural=items.map((item,i)=>{
    const source=item.uri?{uri:item.uri}:item.source;
    const resolved=source?Image.resolveAssetSource(source):null;
    return sizes[i]??item.naturalSize??{width:resolved?.width??0,height:resolved?.height??0};
  });
  const fits=natural.map(size=>size.width>0&&size.height>0?fitImage(size,viewport):viewport);
  const scale=useSharedValue(1),x=useSharedValue(0),y=useSharedValue(0);
  const active=useSharedValue(initial),track=useSharedValue(0),trackStart=useSharedValue(0);
  const mode=useSharedValue(0),multiTouch=useSharedValue(false),pinching=useSharedValue(false);
  const startScale=useSharedValue(1),startX=useSharedValue(0),startY=useSharedValue(0);
  const focalX=useSharedValue(0),focalY=useSharedValue(0);
  const panX=useSharedValue(0),panY=useSharedValue(0);
  const panStartX=useSharedValue(0),panStartY=useSharedValue(0),panPointers=useSharedValue(0);
  useEffect(()=>{
    cancelAnimation(scale);cancelAnimation(x);cancelAnimation(y);
    scale.value=1;x.value=0;y.value=0;
    cancelAnimation(track);track.value=-active.value*viewport.width;
    mode.value=0;
  },[viewport.width,viewport.height,scale,x,y,track,active,mode]);
  useEffect(()=>{
    const next=boundImageTransform({scale:scale.value,x:x.value,y:y.value},fits[index]!,viewport);
    scale.value=next.scale;x.value=next.x;y.value=next.y;
  },[fits[index]?.width,fits[index]?.height,index,scale,x,y]);
  const notifyPage=(next:number)=>{setIndex(next);request.onIndexChange?.(next);};
  const selectAccessiblePage=(next:number)=>{
    next=Math.max(0,Math.min(items.length-1,next));
    cancelAnimation(scale);cancelAnimation(x);cancelAnimation(y);cancelAnimation(track);
    active.value=next;scale.value=1;x.value=0;y.value=0;
    track.value=withTiming(-next*viewport.width,{duration:220});notifyPage(next);
  };
  const pinch=Gesture.Pinch().onStart(event=>{
    multiTouch.value=true;pinching.value=true;mode.value=0;
    cancelAnimation(track);track.value=-active.value*viewport.width;
    cancelAnimation(scale);cancelAnimation(x);cancelAnimation(y);
    startScale.value=scale.value;startX.value=x.value;startY.value=y.value;
    focalX.value=event.focalX-viewport.width/2;focalY.value=event.focalY-viewport.height/2;
  }).onUpdate(event=>{
    const next=zoomImageAt({scale:startScale.value,x:startX.value,y:startY.value},startScale.value*event.scale,
      {x:focalX.value,y:focalY.value},{x:event.focalX-viewport.width/2,y:event.focalY-viewport.height/2},fits[active.value]!,viewport);
    scale.value=next.scale;x.value=next.x;y.value=next.y;
  }).onFinalize(()=>{pinching.value=false;});
  const pan=Gesture.Pan().minDistance(3).onBegin(()=>{multiTouch.value=pinching.value;})
  .onTouchesDown(event=>{if(event.numberOfTouches>1){multiTouch.value=true;mode.value=0;cancelAnimation(track);track.value=-active.value*viewport.width;}})
  .onStart(event=>{
    cancelAnimation(scale);cancelAnimation(x);cancelAnimation(y);
    cancelAnimation(track);trackStart.value=track.value;
    mode.value=scale.value>1.01?2:!multiTouch.value&&pageCount>1?1:0;
    panX.value=x.value;panY.value=y.value;
    panStartX.value=event.translationX;panStartY.value=event.translationY;panPointers.value=event.numberOfPointers;
  }).onUpdate(event=>{
    // Pinch owns two-finger motion. Rebase when one finger remains, avoiding a jump
    // from translations accumulated while the pinch was moving the image.
    if(event.numberOfPointers!==1||panPointers.value!==1){
      if(event.numberOfPointers>1){multiTouch.value=true;mode.value=0;}
      panX.value=x.value;panY.value=y.value;
      panStartX.value=event.translationX;panStartY.value=event.translationY;panPointers.value=event.numberOfPointers;
      return;
    }
    if(mode.value===1&&!multiTouch.value){
      if(Math.abs(event.translationY)>Math.abs(event.translationX)){mode.value=0;return;}
      track.value=Math.max(-(pageCount-1)*viewport.width,Math.min(0,trackStart.value+event.translationX));return;
    }
    if(scale.value<=1||pinching.value)return;
    const next=boundImageTransform({scale:scale.value,x:panX.value+event.translationX-panStartX.value,y:panY.value+event.translationY-panStartY.value},fits[active.value]!,viewport);
    x.value=next.x;y.value=next.y;
  }).onEnd((event,success)=>{
    const next=galleryPageAfterDrag(active.value,pageCount,viewport.width,track.value+active.value*viewport.width,event.velocityX,
      success&&mode.value===1&&!multiTouch.value&&Math.abs(event.translationX)>Math.abs(event.translationY));
    if(next!==active.value){active.value=next;scale.value=1;x.value=0;y.value=0;runOnJS(notifyPage)(next);}
    track.value=withTiming(-active.value*viewport.width,{duration:220});mode.value=0;
  }).onFinalize(()=>{track.value=withTiming(-active.value*viewport.width,{duration:220});mode.value=0;});
  const doubleTap=Gesture.Tap().numberOfTaps(2).maxDelay(280).maxDistance(12).onEnd((event,success)=>{
    if(!success)return;
    const point={x:event.x-viewport.width/2,y:event.y-viewport.height/2};
    cancelAnimation(track);track.value=-active.value*viewport.width;mode.value=0;
    const next=zoomImageAt({scale:scale.value,x:x.value,y:y.value},scale.value>1.05?1:2.5,point,point,fits[active.value]!,viewport);
    scale.value=withTiming(next.scale,{duration:180});x.value=withTiming(next.x,{duration:180});y.value=withTiming(next.y,{duration:180});
  });
  const slide=useAnimatedStyle(()=>({transform:[{translateX:track.value}]}));
  return <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" hidden={false}/>
      <GestureDetector gesture={Gesture.Simultaneous(pinch,pan,doubleTap)}>
        <View collapsable={false} style={styles.viewport} accessible={pageCount>1}
          accessibilityRole={items.length>1?'adjustable':undefined} accessibilityLabel={items[index]?.accessibilityLabel}
          accessibilityValue={items.length>1?{min:1,max:items.length,now:index+1}:undefined}
          accessibilityActions={items.length>1?[{name:'increment'},{name:'decrement'}]:undefined}
          onAccessibilityAction={event=>selectAccessiblePage(active.value+(event.nativeEvent.actionName==='increment'?1:-1))}
          onLayout={event=>{
          const {width,height}=event.nativeEvent.layout;setViewport(previous=>previous.width===width&&previous.height===height?previous:{width,height});
        }}>
          <Animated.View style={[{width:viewport.width*items.length,height:viewport.height,flexDirection:'row',position:'absolute',left:0},slide]}>
            {items.map((item,i)=><ViewerPage key={item.id??i} item={item} page={i} selected={index===i} active={active}
              natural={natural[i]!} fitted={fits[i]!} viewport={viewport} scale={scale} x={x} y={y}
              onSize={size=>setSizes(previous=>previous[i]?.width===size.width&&previous[i]?.height===size.height?previous:{...previous,[i]:size})}/>)}
          </Animated.View>
        </View>
      </GestureDetector>
      <ChromeBackButton accessibilityLabel={getEntryCopy(locale).closeMediaA11y} onPress={onClose} style={[styles.back,{
        left:(width-390*chromeScale)/2+16*chromeScale,
        top:(height-844*chromeScale)/2+chromeTop(12)*chromeScale,
        transform:[{scale:chromeScale}],transformOrigin:'top left',
      }]}/>
    </GestureHandlerRootView>
  </Modal>;
}

function ViewerPage({item,page,selected,active,natural,fitted,viewport,scale,x,y,onSize}:{item:ImageViewerItem;page:number;selected:boolean;
  active:SharedValue<number>;natural:ImageSize;fitted:ImageSize;viewport:ImageSize;scale:SharedValue<number>;x:SharedValue<number>;y:SharedValue<number>;onSize(size:ImageSize):void}) {
  const source=item.uri?{uri:item.uri}:item.source;
  const transform=useAnimatedStyle(()=>({transform:[{translateX:active.value===page?x.value:0},{translateY:active.value===page?y.value:0},{scale:active.value===page?scale.value:1}]}));
  return <View style={{width:viewport.width,height:viewport.height,alignItems:'center',justifyContent:'center',overflow:'hidden'}}
    accessibilityElementsHidden={!selected} importantForAccessibility={selected?'auto':'no-hide-descendants'}>
    <Animated.View style={[{width:fitted.width,height:fitted.height},transform]} accessibilityRole="image" accessibilityLabel={item.accessibilityLabel}>
      {source?<Image source={source} resizeMode="contain" style={StyleSheet.absoluteFill} fadeDuration={0}
        onLoad={event=>{const size=event.nativeEvent.source;if(size.width>0&&size.height>0)onSize({width:size.width,height:size.height});}}/>:
        <View style={{width:natural.width,height:natural.height,position:'absolute',left:(fitted.width-natural.width)/2,top:(fitted.height-natural.height)/2,
          transform:[{scale:natural.width>0?fitted.width/natural.width:1}]}}>{item.content}</View>}
    </Animated.View>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#FFFFFF'},
  viewport:{flex:1,alignItems:'center',justifyContent:'center',overflow:'hidden',backgroundColor:'#FFFFFF'},
  back:{position:'absolute',left:16,zIndex:2},
});
