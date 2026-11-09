import { useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
import { WebView, type WebViewProps } from "react-native-webview";
import { Icon } from "../../components/commerce";
import { ErrorNotice } from "../../components/ui";
import { colors as c } from "../../theme/tokens";
import { mapNamePredicateScript, vietnameseMapLabel } from "./map-language";

export function AddressMap({ latitude, longitude, address, onChange, height = 170, compact = false }: {
  latitude?: number | null; longitude?: number | null; address: string;
  height?: number; compact?: boolean;
  onChange(latitude: number, longitude: number): void;
}) {
  const web = useRef<WebView<WebViewProps>>(null), lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const [mapError, setMapError] = useState(false), [revision, setRevision] = useState(0);
  // Keep the document stable while the user moves the pin.
  const html = useMemo(() => `<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.css"><style>html,body,#map{height:100%;margin:0;background:#FAF8F5}.maplibregl-ctrl-attrib{font-size:9px}.pin{width:15px;height:15px;border-radius:50%;background:#C59B58;border:3px solid white;box-shadow:0 0 0 2px #B88E4F}</style></head><body><div id="map"></div><script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.js"></script><script>
  function post(v){window.ReactNativeWebView.postMessage(JSON.stringify(v))}
  ${mapNamePredicateScript}
  var viLabel=${JSON.stringify(vietnameseMapLabel())};
  try {var map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/positron',center:[106.2,16.2],zoom:4.5,attributionControl:false}),pin;
  map.on('style.load',function(){map.getStyle().layers.forEach(function(layer){
    var key=(layer.id+' '+(layer['source-layer']||'')).toLowerCase();
    if(layer.type==='background')map.setPaintProperty(layer.id,'background-color','#FFFEFA');
    if(layer.type==='fill'){
      if(/water|ocean/.test(key))map.setPaintProperty(layer.id,'fill-color','#EBF1F4');
      else if(/building/.test(key))map.setPaintProperty(layer.id,'fill-color','#F0EBE3');
      else if(/park|landcover|landuse/.test(key))map.setPaintProperty(layer.id,'fill-color','#F5F4ED');
    }
    if(layer.type==='line'&&/boundary|border/.test(key))map.setPaintProperty(layer.id,'line-color','#CFC6B8');
    if(layer.type==='symbol'&&isPlaceNameLabel(layer.layout?.['text-field']))map.setLayoutProperty(layer.id,'text-field',viLabel);
  })});
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-left');
  map.addControl(new maplibregl.AttributionControl({compact:true}));
  window.movePin=function(lat,lng,focus=true){if(pin)pin.remove();var el=document.createElement('div');el.className='pin';pin=new maplibregl.Marker({element:el}).setLngLat([lng,lat]).addTo(map);if(focus)map.jumpTo({center:[lng,lat],zoom:16})};
  map.on('click',function(e){movePin(e.lngLat.lat,e.lngLat.lng,false);post({latitude:e.lngLat.lat,longitude:e.lngLat.lng})});map.on('load',function(){post({ready:true})});map.on('error',function(e){post({error:true,message:String(e.error?.message || 'Map load error')})});
  }catch(e){post({error:true})}
  </script></body></html>`, []);
  const move = (lat: number, lng: number) => { onChange(lat, lng); web.current?.injectJavaScript(`window.movePin?.(${lat},${lng});true;`); };
  const locate = async (gps: boolean) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Chưa được cấp quyền vị trí. Bạn vẫn có thể chạm bản đồ để đặt ghim.");
      let point: { latitude: number; longitude: number };
      if (gps) {
        point = (await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Chưa lấy được GPS. Hãy bật vị trí hoặc đặt ghim trên bản đồ.")), 20000)),
        ])).coords;
      } else {
        if (!address.trim()) throw new Error("Hãy nhập địa chỉ trước khi tìm trên bản đồ.");
        const points = await Location.geocodeAsync(`${address}, Việt Nam`);
        if (!points.length) throw new Error("Không tìm được vị trí. Hãy chạm bản đồ để đặt ghim.");
        point = points[0];
      }
      move(point.latitude, point.longitude);
    } catch (caught) { setError(caught); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: "row", gap: 8 }}>
      {([{ gps: true, name: "crosshair", label: compact ? "Định vị" : "Vị trí hiện tại" }, { gps: false, name: "search", label: "Tìm địa chỉ" }] as const).map(item => <Pressable key={item.label} accessibilityRole="button" disabled={busy} onPress={() => void locate(item.gps)} style={{ flex: 1, minHeight: 44, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: c.brandBorder, backgroundColor: c.soft, opacity: busy ? 0.5 : 1 }}><Icon name={item.name} size={16} color={c.strong} /><Text style={{ fontSize: 12, color: c.ink }}>{busy ? "Đang tìm…" : item.label}</Text></Pressable>)}
    </View>
    <View style={{ height, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: c.line }}>
      <WebView<WebViewProps> key={revision} ref={web} source={{ html }} originWhitelist={["*"]} javaScriptEnabled userAgent="SCANMS-Mobile/1.0 (Android; address-map)" scrollEnabled={false} setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={request => request.url === "about:blank"}
        onError={() => setMapError(true)}
        onMessage={event => { try { const data = JSON.parse(event.nativeEvent.data); if (data.ready) { setMapError(false); if (latitude != null && longitude != null) web.current?.injectJavaScript(`window.movePin?.(${latitude},${longitude});true;`); } if (data.error) { setMapError(true); if (__DEV__) console.warn("Address map:", data.message || "Network error"); } if (typeof data.latitude === "number" && typeof data.longitude === "number" && Math.abs(data.latitude) <= 90 && Math.abs(data.longitude) <= 180) onChange(data.latitude, data.longitude); } catch { setMapError(true); } }} />
    </View>
    {mapError && <Pressable onPress={() => { setMapError(false); setRevision(value => value + 1); }}><Text style={{ fontSize: 12, color: c.strong }}>Chưa tải được bản đồ · Chạm để thử lại</Text></Pressable>}
    <Text style={{ fontSize: 11, lineHeight: 16, color: c.muted }}>{compact ? "Chạm bản đồ để đặt ghim · Không bắt buộc" : latitude != null && longitude != null ? `Ghim: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : "Chạm bản đồ để ghim vị trí nhận hàng (không bắt buộc)."}</Text>
    {!compact && <Text style={{ fontSize: 11, lineHeight: 16, color: c.muted }}>Ghim không thay thế tỉnh/huyện/xã giao hàng. Kiểm tra địa chỉ và vị trí trước khi lưu.</Text>}
    <ErrorNotice error={error} />
  </View>;
}
