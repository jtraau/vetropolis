// components/MapLayer.jsx
import React from "react";
import useView from "../hooks/useView";
import { MAPS } from "../core/entities";

const MapLayer = ({
  location,
  images = {},
  noOffset = false,
  cellOverride,
}) => {
  const v = useView(location) ?? {};
  const cell = cellOverride ?? v.cell ?? 16;

  const mapDef = MAPS?.[location];
  const GRID_X = mapDef?.GRID_X ?? 16;
  const GRID_Y = mapDef?.GRID_Y ?? 16;

  const EPS = 1;
  const width = GRID_X * cell + EPS;
  const height = GRID_Y * cell + EPS;

  // pilih style background
  let bgStyle = {};
  if (location === "house" && images.house) {
    bgStyle = {
      backgroundImage: `url(${images.house})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${width}px ${height}px`,
      imageRendering: "pixelated",
    };
  } else if (location === "outside" && images.outside) {
    bgStyle = {
      backgroundImage: `url(${images.outside})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${width}px ${height}px`, // ukuran world (tanpa zoom)
      imageRendering: "pixelated",
    };
  } else if (location === "clinic" && images.clinic) {
    bgStyle = {
      backgroundImage: `url(${images.clinic})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${width}px ${height}px`,
      imageRendering: "pixelated",
    };
  } else {
    bgStyle = { backgroundColor: "#222" };
  }

  return (
    <div
      style={{
        position: "absolute",
        left: noOffset ? 0 : v.offsetX,
        top: noOffset ? 0 : v.offsetY,
        width,
        height,
        pointerEvents: "none",
        zIndex: 0,
        ...bgStyle,
      }}
    />
  );
};

export default MapLayer;
