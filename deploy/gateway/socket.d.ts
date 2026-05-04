import { Server } from 'socket.io';
import http from 'http';
export declare function initSocket(server: http.Server): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
