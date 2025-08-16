import React from 'react';
import { useEffect, useState } from "react";
import Modal from "./Modal";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultCenter = [35.6812, 139.7671]; // Tokyo Station fallback

function ClickSetter({ setLatLng }) {
    useMapEvents({
        click(e) {
            setLatLng([e.latlng.lat, e.latlng.lng]);
        },
    });
    return null;
}

export default function EditCoordsModal({ open, onClose, item, onSave }) {
    const [latlng, setLatLng] = useState(item?.coords || null);

    useEffect(() => {
        setLatLng(item?.coords || null);
    }, [item]);

    const markerIcon = new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    const center = latlng || item?.coords || defaultCenter;

    return (
        <Modal open={open} onClose={onClose} theme={{ header: "bg-indigo-600 text-white" }}>
            <div className="grid gap-3">
                <h3 className="text-lg font-semibold">
                    {item?.title ? `Set location – ${item.title}` : "Set location"}
                </h3>

                <div className="text-sm opacity-80">
                    Click on the map to place the pin. You can drag it to fine-tune.
                </div>

                <div className="rounded-xl overflow-hidden shadow">
                    <MapContainer
                        style={{ height: 360, width: "100%" }}
                        center={center}
                        zoom={latlng ? 16 : 12}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ClickSetter setLatLng={setLatLng} />
                        {latlng && (
                            <Marker
                                position={latlng}
                                icon={markerIcon}
                                draggable={true}
                                eventHandlers={{
                                    dragend: (e) => {
                                        const m = e.target;
                                        const p = m.getLatLng();
                                        setLatLng([p.lat, p.lng]);
                                    },
                                }}
                            />
                        )}
                    </MapContainer>
                </div>

                <div className="text-xs opacity-80">
                    {latlng ? (
                        <>Selected: <code>{latlng[0].toFixed(6)}, {latlng[1].toFixed(6)}</code></>
                    ) : (
                        <>No point selected yet.</>
                    )}
                </div>

                <div className="mt-1 flex items-center justify-end gap-2">
                    <button onClick={onClose} className="rounded-md bg-zinc-600 px-3 py-2 text-white hover:bg-zinc-700">
                        Cancel
                    </button>
                    <button
                        disabled={!latlng}
                        onClick={() => onSave?.(latlng)}
                        className="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        Save location
                    </button>
                </div>
            </div>
        </Modal>
    );
}
