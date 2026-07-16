import * as $protobuf from "protobufjs";
import Long from "long";

/** Namespace proto. */
export namespace proto {

    /** Namespace v1. */
    namespace v1 {

        /**
         * Properties of a WSMessage.
         * @deprecated Use proto.v1.WSMessage.$Properties instead.
         */
        type IWSMessage = proto.v1.WSMessage.$Properties;

        /** Represents a WSMessage. */
        class WSMessage {

            /**
             * Constructs a new WSMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.WSMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** WSMessage type. */
            type: string;

            /** WSMessage data. */
            data: Uint8Array;

            /**
             * Creates a new WSMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns WSMessage instance
             */
            static create(properties: proto.v1.WSMessage.$Shape): proto.v1.WSMessage & proto.v1.WSMessage.$Shape;
            static create(properties?: proto.v1.WSMessage.$Properties): proto.v1.WSMessage;

            /**
             * Encodes the specified WSMessage message. Does not implicitly {@link proto.v1.WSMessage.verify|verify} messages.
             * @param message WSMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.WSMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified WSMessage message, length delimited. Does not implicitly {@link proto.v1.WSMessage.verify|verify} messages.
             * @param message WSMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.WSMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a WSMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.WSMessage & proto.v1.WSMessage.$Shape} WSMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.WSMessage & proto.v1.WSMessage.$Shape;

            /**
             * Decodes a WSMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.WSMessage & proto.v1.WSMessage.$Shape} WSMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.WSMessage & proto.v1.WSMessage.$Shape;

            /**
             * Verifies a WSMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a WSMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns WSMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.WSMessage;

            /**
             * Creates a plain object from a WSMessage message. Also converts values to other types if specified.
             * @param message WSMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.WSMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this WSMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for WSMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace WSMessage {

            /** Properties of a WSMessage. */
            interface $Properties {

                /** WSMessage type */
                type?: (string|null);

                /** WSMessage data */
                data?: (Uint8Array|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a WSMessage. */
            type $Shape = proto.v1.WSMessage.$Properties;
        }

        /**
         * Properties of a WSResponse.
         * @deprecated Use proto.v1.WSResponse.$Properties instead.
         */
        type IWSResponse = proto.v1.WSResponse.$Properties;

        /** Represents a WSResponse. */
        class WSResponse {

            /**
             * Constructs a new WSResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.WSResponse.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** WSResponse code. */
            code: number;

            /** WSResponse status. */
            status: boolean;

            /** WSResponse message. */
            message: string;

            /** WSResponse data. */
            data: Uint8Array;

            /** WSResponse details. */
            details: string;

            /** WSResponse vault. */
            vault: string;

            /** WSResponse context. */
            context: string;

            /** WSResponse pageIndex. */
            pageIndex: number;

            /**
             * Creates a new WSResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns WSResponse instance
             */
            static create(properties: proto.v1.WSResponse.$Shape): proto.v1.WSResponse & proto.v1.WSResponse.$Shape;
            static create(properties?: proto.v1.WSResponse.$Properties): proto.v1.WSResponse;

            /**
             * Encodes the specified WSResponse message. Does not implicitly {@link proto.v1.WSResponse.verify|verify} messages.
             * @param message WSResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.WSResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified WSResponse message, length delimited. Does not implicitly {@link proto.v1.WSResponse.verify|verify} messages.
             * @param message WSResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.WSResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a WSResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.WSResponse & proto.v1.WSResponse.$Shape} WSResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.WSResponse & proto.v1.WSResponse.$Shape;

            /**
             * Decodes a WSResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.WSResponse & proto.v1.WSResponse.$Shape} WSResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.WSResponse & proto.v1.WSResponse.$Shape;

            /**
             * Verifies a WSResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a WSResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns WSResponse
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.WSResponse;

            /**
             * Creates a plain object from a WSResponse message. Also converts values to other types if specified.
             * @param message WSResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.WSResponse, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this WSResponse to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for WSResponse
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace WSResponse {

            /** Properties of a WSResponse. */
            interface $Properties {

                /** WSResponse code */
                code?: (number|null);

                /** WSResponse status */
                status?: (boolean|null);

                /** WSResponse message */
                message?: (string|null);

                /** WSResponse data */
                data?: (Uint8Array|null);

                /** WSResponse details */
                details?: (string|null);

                /** WSResponse vault */
                vault?: (string|null);

                /** WSResponse context */
                context?: (string|null);

                /** WSResponse pageIndex */
                pageIndex?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a WSResponse. */
            type $Shape = proto.v1.WSResponse.$Properties;
        }

        /**
         * Properties of a ClientInfoMessage.
         * @deprecated Use proto.v1.ClientInfoMessage.$Properties instead.
         */
        type IClientInfoMessage = proto.v1.ClientInfoMessage.$Properties;

        /** Represents a ClientInfoMessage. */
        class ClientInfoMessage {

            /**
             * Constructs a new ClientInfoMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.ClientInfoMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** ClientInfoMessage name. */
            name: string;

            /** ClientInfoMessage version. */
            version: string;

            /** ClientInfoMessage type. */
            type: string;

            /** ClientInfoMessage isDesktop. */
            isDesktop: boolean;

            /** ClientInfoMessage isMobile. */
            isMobile: boolean;

            /** ClientInfoMessage isPhone. */
            isPhone: boolean;

            /** ClientInfoMessage isTablet. */
            isTablet: boolean;

            /** ClientInfoMessage isMacOS. */
            isMacOS: boolean;

            /** ClientInfoMessage isWin. */
            isWin: boolean;

            /** ClientInfoMessage isLinux. */
            isLinux: boolean;

            /** ClientInfoMessage offlineSyncStrategy. */
            offlineSyncStrategy: string;

            /** ClientInfoMessage protobuf. */
            protobuf: boolean;

            /**
             * Creates a new ClientInfoMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ClientInfoMessage instance
             */
            static create(properties: proto.v1.ClientInfoMessage.$Shape): proto.v1.ClientInfoMessage & proto.v1.ClientInfoMessage.$Shape;
            static create(properties?: proto.v1.ClientInfoMessage.$Properties): proto.v1.ClientInfoMessage;

            /**
             * Encodes the specified ClientInfoMessage message. Does not implicitly {@link proto.v1.ClientInfoMessage.verify|verify} messages.
             * @param message ClientInfoMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.ClientInfoMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ClientInfoMessage message, length delimited. Does not implicitly {@link proto.v1.ClientInfoMessage.verify|verify} messages.
             * @param message ClientInfoMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.ClientInfoMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ClientInfoMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.ClientInfoMessage & proto.v1.ClientInfoMessage.$Shape} ClientInfoMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.ClientInfoMessage & proto.v1.ClientInfoMessage.$Shape;

            /**
             * Decodes a ClientInfoMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.ClientInfoMessage & proto.v1.ClientInfoMessage.$Shape} ClientInfoMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.ClientInfoMessage & proto.v1.ClientInfoMessage.$Shape;

            /**
             * Verifies a ClientInfoMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a ClientInfoMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ClientInfoMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.ClientInfoMessage;

            /**
             * Creates a plain object from a ClientInfoMessage message. Also converts values to other types if specified.
             * @param message ClientInfoMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.ClientInfoMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this ClientInfoMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for ClientInfoMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace ClientInfoMessage {

            /** Properties of a ClientInfoMessage. */
            interface $Properties {

                /** ClientInfoMessage name */
                name?: (string|null);

                /** ClientInfoMessage version */
                version?: (string|null);

                /** ClientInfoMessage type */
                type?: (string|null);

                /** ClientInfoMessage isDesktop */
                isDesktop?: (boolean|null);

                /** ClientInfoMessage isMobile */
                isMobile?: (boolean|null);

                /** ClientInfoMessage isPhone */
                isPhone?: (boolean|null);

                /** ClientInfoMessage isTablet */
                isTablet?: (boolean|null);

                /** ClientInfoMessage isMacOS */
                isMacOS?: (boolean|null);

                /** ClientInfoMessage isWin */
                isWin?: (boolean|null);

                /** ClientInfoMessage isLinux */
                isLinux?: (boolean|null);

                /** ClientInfoMessage offlineSyncStrategy */
                offlineSyncStrategy?: (string|null);

                /** ClientInfoMessage protobuf */
                protobuf?: (boolean|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a ClientInfoMessage. */
            type $Shape = proto.v1.ClientInfoMessage.$Properties;
        }

        /**
         * Properties of a HistoricalVersion.
         * @deprecated Use proto.v1.HistoricalVersion.$Properties instead.
         */
        type IHistoricalVersion = proto.v1.HistoricalVersion.$Properties;

        /** Represents a HistoricalVersion. */
        class HistoricalVersion {

            /**
             * Constructs a new HistoricalVersion.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.HistoricalVersion.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** HistoricalVersion version. */
            version: string;

            /** HistoricalVersion changelogContent. */
            changelogContent: string;

            /**
             * Creates a new HistoricalVersion instance using the specified properties.
             * @param [properties] Properties to set
             * @returns HistoricalVersion instance
             */
            static create(properties: proto.v1.HistoricalVersion.$Shape): proto.v1.HistoricalVersion & proto.v1.HistoricalVersion.$Shape;
            static create(properties?: proto.v1.HistoricalVersion.$Properties): proto.v1.HistoricalVersion;

            /**
             * Encodes the specified HistoricalVersion message. Does not implicitly {@link proto.v1.HistoricalVersion.verify|verify} messages.
             * @param message HistoricalVersion message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.HistoricalVersion.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified HistoricalVersion message, length delimited. Does not implicitly {@link proto.v1.HistoricalVersion.verify|verify} messages.
             * @param message HistoricalVersion message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.HistoricalVersion.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a HistoricalVersion message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.HistoricalVersion & proto.v1.HistoricalVersion.$Shape} HistoricalVersion
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.HistoricalVersion & proto.v1.HistoricalVersion.$Shape;

            /**
             * Decodes a HistoricalVersion message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.HistoricalVersion & proto.v1.HistoricalVersion.$Shape} HistoricalVersion
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.HistoricalVersion & proto.v1.HistoricalVersion.$Shape;

            /**
             * Verifies a HistoricalVersion message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a HistoricalVersion message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns HistoricalVersion
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.HistoricalVersion;

            /**
             * Creates a plain object from a HistoricalVersion message. Also converts values to other types if specified.
             * @param message HistoricalVersion
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.HistoricalVersion, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this HistoricalVersion to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for HistoricalVersion
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace HistoricalVersion {

            /** Properties of a HistoricalVersion. */
            interface $Properties {

                /** HistoricalVersion version */
                version?: (string|null);

                /** HistoricalVersion changelogContent */
                changelogContent?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a HistoricalVersion. */
            type $Shape = proto.v1.HistoricalVersion.$Properties;
        }

        /**
         * Properties of a CheckVersionInfo.
         * @deprecated Use proto.v1.CheckVersionInfo.$Properties instead.
         */
        type ICheckVersionInfo = proto.v1.CheckVersionInfo.$Properties;

        /** Represents a CheckVersionInfo. */
        class CheckVersionInfo {

            /**
             * Constructs a new CheckVersionInfo.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.CheckVersionInfo.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** CheckVersionInfo githubAvailable. */
            githubAvailable: boolean;

            /** CheckVersionInfo versionIsNew. */
            versionIsNew: boolean;

            /** CheckVersionInfo versionNewName. */
            versionNewName: string;

            /** CheckVersionInfo versionNewLink. */
            versionNewLink: string;

            /** CheckVersionInfo versionNewChangelog. */
            versionNewChangelog: string;

            /** CheckVersionInfo versionNewChangelogContent. */
            versionNewChangelogContent: string;

            /** CheckVersionInfo versionHistory. */
            versionHistory: proto.v1.HistoricalVersion.$Properties[];

            /** CheckVersionInfo pluginVersionIsNew. */
            pluginVersionIsNew: boolean;

            /** CheckVersionInfo pluginVersionNewName. */
            pluginVersionNewName: string;

            /** CheckVersionInfo pluginVersionNewLink. */
            pluginVersionNewLink: string;

            /** CheckVersionInfo pluginVersionNewChangelog. */
            pluginVersionNewChangelog: string;

            /** CheckVersionInfo pluginVersionNewChangelogContent. */
            pluginVersionNewChangelogContent: string;

            /** CheckVersionInfo pluginVersionHistory. */
            pluginVersionHistory: proto.v1.HistoricalVersion.$Properties[];

            /** CheckVersionInfo syncUpChunkNum. */
            syncUpChunkNum: number;

            /** CheckVersionInfo syncDownChunkNum. */
            syncDownChunkNum: number;

            /** CheckVersionInfo pipelineWindowUp. */
            pipelineWindowUp: number;

            /** CheckVersionInfo pipelineWindowDown. */
            pipelineWindowDown: number;

            /**
             * Creates a new CheckVersionInfo instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CheckVersionInfo instance
             */
            static create(properties: proto.v1.CheckVersionInfo.$Shape): proto.v1.CheckVersionInfo & proto.v1.CheckVersionInfo.$Shape;
            static create(properties?: proto.v1.CheckVersionInfo.$Properties): proto.v1.CheckVersionInfo;

            /**
             * Encodes the specified CheckVersionInfo message. Does not implicitly {@link proto.v1.CheckVersionInfo.verify|verify} messages.
             * @param message CheckVersionInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.CheckVersionInfo.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CheckVersionInfo message, length delimited. Does not implicitly {@link proto.v1.CheckVersionInfo.verify|verify} messages.
             * @param message CheckVersionInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.CheckVersionInfo.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CheckVersionInfo message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.CheckVersionInfo & proto.v1.CheckVersionInfo.$Shape} CheckVersionInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.CheckVersionInfo & proto.v1.CheckVersionInfo.$Shape;

            /**
             * Decodes a CheckVersionInfo message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.CheckVersionInfo & proto.v1.CheckVersionInfo.$Shape} CheckVersionInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.CheckVersionInfo & proto.v1.CheckVersionInfo.$Shape;

            /**
             * Verifies a CheckVersionInfo message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a CheckVersionInfo message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CheckVersionInfo
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.CheckVersionInfo;

            /**
             * Creates a plain object from a CheckVersionInfo message. Also converts values to other types if specified.
             * @param message CheckVersionInfo
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.CheckVersionInfo, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this CheckVersionInfo to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for CheckVersionInfo
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace CheckVersionInfo {

            /** Properties of a CheckVersionInfo. */
            interface $Properties {

                /** CheckVersionInfo githubAvailable */
                githubAvailable?: (boolean|null);

                /** CheckVersionInfo versionIsNew */
                versionIsNew?: (boolean|null);

                /** CheckVersionInfo versionNewName */
                versionNewName?: (string|null);

                /** CheckVersionInfo versionNewLink */
                versionNewLink?: (string|null);

                /** CheckVersionInfo versionNewChangelog */
                versionNewChangelog?: (string|null);

                /** CheckVersionInfo versionNewChangelogContent */
                versionNewChangelogContent?: (string|null);

                /** CheckVersionInfo versionHistory */
                versionHistory?: (proto.v1.HistoricalVersion.$Properties[]|null);

                /** CheckVersionInfo pluginVersionIsNew */
                pluginVersionIsNew?: (boolean|null);

                /** CheckVersionInfo pluginVersionNewName */
                pluginVersionNewName?: (string|null);

                /** CheckVersionInfo pluginVersionNewLink */
                pluginVersionNewLink?: (string|null);

                /** CheckVersionInfo pluginVersionNewChangelog */
                pluginVersionNewChangelog?: (string|null);

                /** CheckVersionInfo pluginVersionNewChangelogContent */
                pluginVersionNewChangelogContent?: (string|null);

                /** CheckVersionInfo pluginVersionHistory */
                pluginVersionHistory?: (proto.v1.HistoricalVersion.$Properties[]|null);

                /** CheckVersionInfo syncUpChunkNum */
                syncUpChunkNum?: (number|null);

                /** CheckVersionInfo syncDownChunkNum */
                syncDownChunkNum?: (number|null);

                /** CheckVersionInfo pipelineWindowUp */
                pipelineWindowUp?: (number|null);

                /** CheckVersionInfo pipelineWindowDown */
                pipelineWindowDown?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a CheckVersionInfo. */
            type $Shape = proto.v1.CheckVersionInfo.$Properties;
        }

        /**
         * Properties of a NoteSyncCheckRequest.
         * @deprecated Use proto.v1.NoteSyncCheckRequest.$Properties instead.
         */
        type INoteSyncCheckRequest = proto.v1.NoteSyncCheckRequest.$Properties;

        /** Represents a NoteSyncCheckRequest. */
        class NoteSyncCheckRequest {

            /**
             * Constructs a new NoteSyncCheckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncCheckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncCheckRequest path. */
            path: string;

            /** NoteSyncCheckRequest pathHash. */
            pathHash: string;

            /** NoteSyncCheckRequest contentHash. */
            contentHash: string;

            /** NoteSyncCheckRequest mtime. */
            mtime: (number|Long);

            /** NoteSyncCheckRequest ctime. */
            ctime: (number|Long);

            /**
             * Creates a new NoteSyncCheckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncCheckRequest instance
             */
            static create(properties: proto.v1.NoteSyncCheckRequest.$Shape): proto.v1.NoteSyncCheckRequest & proto.v1.NoteSyncCheckRequest.$Shape;
            static create(properties?: proto.v1.NoteSyncCheckRequest.$Properties): proto.v1.NoteSyncCheckRequest;

            /**
             * Encodes the specified NoteSyncCheckRequest message. Does not implicitly {@link proto.v1.NoteSyncCheckRequest.verify|verify} messages.
             * @param message NoteSyncCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncCheckRequest message, length delimited. Does not implicitly {@link proto.v1.NoteSyncCheckRequest.verify|verify} messages.
             * @param message NoteSyncCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncCheckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncCheckRequest & proto.v1.NoteSyncCheckRequest.$Shape} NoteSyncCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncCheckRequest & proto.v1.NoteSyncCheckRequest.$Shape;

            /**
             * Decodes a NoteSyncCheckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncCheckRequest & proto.v1.NoteSyncCheckRequest.$Shape} NoteSyncCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncCheckRequest & proto.v1.NoteSyncCheckRequest.$Shape;

            /**
             * Verifies a NoteSyncCheckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncCheckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncCheckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncCheckRequest;

            /**
             * Creates a plain object from a NoteSyncCheckRequest message. Also converts values to other types if specified.
             * @param message NoteSyncCheckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncCheckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncCheckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncCheckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncCheckRequest {

            /** Properties of a NoteSyncCheckRequest. */
            interface $Properties {

                /** NoteSyncCheckRequest path */
                path?: (string|null);

                /** NoteSyncCheckRequest pathHash */
                pathHash?: (string|null);

                /** NoteSyncCheckRequest contentHash */
                contentHash?: (string|null);

                /** NoteSyncCheckRequest mtime */
                mtime?: (number|Long|null);

                /** NoteSyncCheckRequest ctime */
                ctime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncCheckRequest. */
            type $Shape = proto.v1.NoteSyncCheckRequest.$Properties;
        }

        /**
         * Properties of a NoteSyncDelNote.
         * @deprecated Use proto.v1.NoteSyncDelNote.$Properties instead.
         */
        type INoteSyncDelNote = proto.v1.NoteSyncDelNote.$Properties;

        /** Represents a NoteSyncDelNote. */
        class NoteSyncDelNote {

            /**
             * Constructs a new NoteSyncDelNote.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncDelNote.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncDelNote path. */
            path: string;

            /** NoteSyncDelNote pathHash. */
            pathHash: string;

            /**
             * Creates a new NoteSyncDelNote instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncDelNote instance
             */
            static create(properties: proto.v1.NoteSyncDelNote.$Shape): proto.v1.NoteSyncDelNote & proto.v1.NoteSyncDelNote.$Shape;
            static create(properties?: proto.v1.NoteSyncDelNote.$Properties): proto.v1.NoteSyncDelNote;

            /**
             * Encodes the specified NoteSyncDelNote message. Does not implicitly {@link proto.v1.NoteSyncDelNote.verify|verify} messages.
             * @param message NoteSyncDelNote message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncDelNote.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncDelNote message, length delimited. Does not implicitly {@link proto.v1.NoteSyncDelNote.verify|verify} messages.
             * @param message NoteSyncDelNote message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncDelNote.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncDelNote message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncDelNote & proto.v1.NoteSyncDelNote.$Shape} NoteSyncDelNote
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncDelNote & proto.v1.NoteSyncDelNote.$Shape;

            /**
             * Decodes a NoteSyncDelNote message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncDelNote & proto.v1.NoteSyncDelNote.$Shape} NoteSyncDelNote
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncDelNote & proto.v1.NoteSyncDelNote.$Shape;

            /**
             * Verifies a NoteSyncDelNote message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncDelNote message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncDelNote
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncDelNote;

            /**
             * Creates a plain object from a NoteSyncDelNote message. Also converts values to other types if specified.
             * @param message NoteSyncDelNote
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncDelNote, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncDelNote to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncDelNote
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncDelNote {

            /** Properties of a NoteSyncDelNote. */
            interface $Properties {

                /** NoteSyncDelNote path */
                path?: (string|null);

                /** NoteSyncDelNote pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncDelNote. */
            type $Shape = proto.v1.NoteSyncDelNote.$Properties;
        }

        /**
         * Properties of a NoteSyncRequest.
         * @deprecated Use proto.v1.NoteSyncRequest.$Properties instead.
         */
        type INoteSyncRequest = proto.v1.NoteSyncRequest.$Properties;

        /** Represents a NoteSyncRequest. */
        class NoteSyncRequest {

            /**
             * Constructs a new NoteSyncRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncRequest context. */
            context: string;

            /** NoteSyncRequest vault. */
            vault: string;

            /** NoteSyncRequest lastTime. */
            lastTime: (number|Long);

            /** NoteSyncRequest notes. */
            notes: proto.v1.NoteSyncCheckRequest.$Properties[];

            /** NoteSyncRequest delNotes. */
            delNotes: proto.v1.NoteSyncDelNote.$Properties[];

            /** NoteSyncRequest missingNotes. */
            missingNotes: proto.v1.NoteSyncDelNote.$Properties[];

            /** NoteSyncRequest batchIndex. */
            batchIndex: number;

            /** NoteSyncRequest totalBatches. */
            totalBatches: number;

            /**
             * Creates a new NoteSyncRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncRequest instance
             */
            static create(properties: proto.v1.NoteSyncRequest.$Shape): proto.v1.NoteSyncRequest & proto.v1.NoteSyncRequest.$Shape;
            static create(properties?: proto.v1.NoteSyncRequest.$Properties): proto.v1.NoteSyncRequest;

            /**
             * Encodes the specified NoteSyncRequest message. Does not implicitly {@link proto.v1.NoteSyncRequest.verify|verify} messages.
             * @param message NoteSyncRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncRequest message, length delimited. Does not implicitly {@link proto.v1.NoteSyncRequest.verify|verify} messages.
             * @param message NoteSyncRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncRequest & proto.v1.NoteSyncRequest.$Shape} NoteSyncRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncRequest & proto.v1.NoteSyncRequest.$Shape;

            /**
             * Decodes a NoteSyncRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncRequest & proto.v1.NoteSyncRequest.$Shape} NoteSyncRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncRequest & proto.v1.NoteSyncRequest.$Shape;

            /**
             * Verifies a NoteSyncRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncRequest;

            /**
             * Creates a plain object from a NoteSyncRequest message. Also converts values to other types if specified.
             * @param message NoteSyncRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncRequest {

            /** Properties of a NoteSyncRequest. */
            interface $Properties {

                /** NoteSyncRequest context */
                context?: (string|null);

                /** NoteSyncRequest vault */
                vault?: (string|null);

                /** NoteSyncRequest lastTime */
                lastTime?: (number|Long|null);

                /** NoteSyncRequest notes */
                notes?: (proto.v1.NoteSyncCheckRequest.$Properties[]|null);

                /** NoteSyncRequest delNotes */
                delNotes?: (proto.v1.NoteSyncDelNote.$Properties[]|null);

                /** NoteSyncRequest missingNotes */
                missingNotes?: (proto.v1.NoteSyncDelNote.$Properties[]|null);

                /** NoteSyncRequest batchIndex */
                batchIndex?: (number|null);

                /** NoteSyncRequest totalBatches */
                totalBatches?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncRequest. */
            type $Shape = proto.v1.NoteSyncRequest.$Properties;
        }

        /**
         * Properties of a NoteModifyOrCreateRequest.
         * @deprecated Use proto.v1.NoteModifyOrCreateRequest.$Properties instead.
         */
        type INoteModifyOrCreateRequest = proto.v1.NoteModifyOrCreateRequest.$Properties;

        /** Represents a NoteModifyOrCreateRequest. */
        class NoteModifyOrCreateRequest {

            /**
             * Constructs a new NoteModifyOrCreateRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteModifyOrCreateRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteModifyOrCreateRequest vault. */
            vault: string;

            /** NoteModifyOrCreateRequest path. */
            path: string;

            /** NoteModifyOrCreateRequest pathHash. */
            pathHash: string;

            /** NoteModifyOrCreateRequest baseHash. */
            baseHash: string;

            /** NoteModifyOrCreateRequest baseHashMissing. */
            baseHashMissing: boolean;

            /** NoteModifyOrCreateRequest content. */
            content: string;

            /** NoteModifyOrCreateRequest contentHash. */
            contentHash: string;

            /** NoteModifyOrCreateRequest ctime. */
            ctime: (number|Long);

            /** NoteModifyOrCreateRequest mtime. */
            mtime: (number|Long);

            /** NoteModifyOrCreateRequest createOnly. */
            createOnly: boolean;

            /** NoteModifyOrCreateRequest context. */
            context: string;

            /** NoteModifyOrCreateRequest isConflictResolved. */
            isConflictResolved: boolean;

            /**
             * Creates a new NoteModifyOrCreateRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteModifyOrCreateRequest instance
             */
            static create(properties: proto.v1.NoteModifyOrCreateRequest.$Shape): proto.v1.NoteModifyOrCreateRequest & proto.v1.NoteModifyOrCreateRequest.$Shape;
            static create(properties?: proto.v1.NoteModifyOrCreateRequest.$Properties): proto.v1.NoteModifyOrCreateRequest;

            /**
             * Encodes the specified NoteModifyOrCreateRequest message. Does not implicitly {@link proto.v1.NoteModifyOrCreateRequest.verify|verify} messages.
             * @param message NoteModifyOrCreateRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteModifyOrCreateRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteModifyOrCreateRequest message, length delimited. Does not implicitly {@link proto.v1.NoteModifyOrCreateRequest.verify|verify} messages.
             * @param message NoteModifyOrCreateRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteModifyOrCreateRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteModifyOrCreateRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteModifyOrCreateRequest & proto.v1.NoteModifyOrCreateRequest.$Shape} NoteModifyOrCreateRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteModifyOrCreateRequest & proto.v1.NoteModifyOrCreateRequest.$Shape;

            /**
             * Decodes a NoteModifyOrCreateRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteModifyOrCreateRequest & proto.v1.NoteModifyOrCreateRequest.$Shape} NoteModifyOrCreateRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteModifyOrCreateRequest & proto.v1.NoteModifyOrCreateRequest.$Shape;

            /**
             * Verifies a NoteModifyOrCreateRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteModifyOrCreateRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteModifyOrCreateRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteModifyOrCreateRequest;

            /**
             * Creates a plain object from a NoteModifyOrCreateRequest message. Also converts values to other types if specified.
             * @param message NoteModifyOrCreateRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteModifyOrCreateRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteModifyOrCreateRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteModifyOrCreateRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteModifyOrCreateRequest {

            /** Properties of a NoteModifyOrCreateRequest. */
            interface $Properties {

                /** NoteModifyOrCreateRequest vault */
                vault?: (string|null);

                /** NoteModifyOrCreateRequest path */
                path?: (string|null);

                /** NoteModifyOrCreateRequest pathHash */
                pathHash?: (string|null);

                /** NoteModifyOrCreateRequest baseHash */
                baseHash?: (string|null);

                /** NoteModifyOrCreateRequest baseHashMissing */
                baseHashMissing?: (boolean|null);

                /** NoteModifyOrCreateRequest content */
                content?: (string|null);

                /** NoteModifyOrCreateRequest contentHash */
                contentHash?: (string|null);

                /** NoteModifyOrCreateRequest ctime */
                ctime?: (number|Long|null);

                /** NoteModifyOrCreateRequest mtime */
                mtime?: (number|Long|null);

                /** NoteModifyOrCreateRequest createOnly */
                createOnly?: (boolean|null);

                /** NoteModifyOrCreateRequest context */
                context?: (string|null);

                /** NoteModifyOrCreateRequest isConflictResolved */
                isConflictResolved?: (boolean|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteModifyOrCreateRequest. */
            type $Shape = proto.v1.NoteModifyOrCreateRequest.$Properties;
        }

        /**
         * Properties of a NoteUpdateCheckRequest.
         * @deprecated Use proto.v1.NoteUpdateCheckRequest.$Properties instead.
         */
        type INoteUpdateCheckRequest = proto.v1.NoteUpdateCheckRequest.$Properties;

        /** Represents a NoteUpdateCheckRequest. */
        class NoteUpdateCheckRequest {

            /**
             * Constructs a new NoteUpdateCheckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteUpdateCheckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteUpdateCheckRequest vault. */
            vault: string;

            /** NoteUpdateCheckRequest path. */
            path: string;

            /** NoteUpdateCheckRequest pathHash. */
            pathHash: string;

            /** NoteUpdateCheckRequest contentHash. */
            contentHash: string;

            /** NoteUpdateCheckRequest ctime. */
            ctime: (number|Long);

            /** NoteUpdateCheckRequest mtime. */
            mtime: (number|Long);

            /**
             * Creates a new NoteUpdateCheckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteUpdateCheckRequest instance
             */
            static create(properties: proto.v1.NoteUpdateCheckRequest.$Shape): proto.v1.NoteUpdateCheckRequest & proto.v1.NoteUpdateCheckRequest.$Shape;
            static create(properties?: proto.v1.NoteUpdateCheckRequest.$Properties): proto.v1.NoteUpdateCheckRequest;

            /**
             * Encodes the specified NoteUpdateCheckRequest message. Does not implicitly {@link proto.v1.NoteUpdateCheckRequest.verify|verify} messages.
             * @param message NoteUpdateCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteUpdateCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteUpdateCheckRequest message, length delimited. Does not implicitly {@link proto.v1.NoteUpdateCheckRequest.verify|verify} messages.
             * @param message NoteUpdateCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteUpdateCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteUpdateCheckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteUpdateCheckRequest & proto.v1.NoteUpdateCheckRequest.$Shape} NoteUpdateCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteUpdateCheckRequest & proto.v1.NoteUpdateCheckRequest.$Shape;

            /**
             * Decodes a NoteUpdateCheckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteUpdateCheckRequest & proto.v1.NoteUpdateCheckRequest.$Shape} NoteUpdateCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteUpdateCheckRequest & proto.v1.NoteUpdateCheckRequest.$Shape;

            /**
             * Verifies a NoteUpdateCheckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteUpdateCheckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteUpdateCheckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteUpdateCheckRequest;

            /**
             * Creates a plain object from a NoteUpdateCheckRequest message. Also converts values to other types if specified.
             * @param message NoteUpdateCheckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteUpdateCheckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteUpdateCheckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteUpdateCheckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteUpdateCheckRequest {

            /** Properties of a NoteUpdateCheckRequest. */
            interface $Properties {

                /** NoteUpdateCheckRequest vault */
                vault?: (string|null);

                /** NoteUpdateCheckRequest path */
                path?: (string|null);

                /** NoteUpdateCheckRequest pathHash */
                pathHash?: (string|null);

                /** NoteUpdateCheckRequest contentHash */
                contentHash?: (string|null);

                /** NoteUpdateCheckRequest ctime */
                ctime?: (number|Long|null);

                /** NoteUpdateCheckRequest mtime */
                mtime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteUpdateCheckRequest. */
            type $Shape = proto.v1.NoteUpdateCheckRequest.$Properties;
        }

        /**
         * Properties of a NoteDeleteRequest.
         * @deprecated Use proto.v1.NoteDeleteRequest.$Properties instead.
         */
        type INoteDeleteRequest = proto.v1.NoteDeleteRequest.$Properties;

        /** Represents a NoteDeleteRequest. */
        class NoteDeleteRequest {

            /**
             * Constructs a new NoteDeleteRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteDeleteRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteDeleteRequest vault. */
            vault: string;

            /** NoteDeleteRequest path. */
            path: string;

            /** NoteDeleteRequest pathHash. */
            pathHash: string;

            /** NoteDeleteRequest context. */
            context: string;

            /**
             * Creates a new NoteDeleteRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteDeleteRequest instance
             */
            static create(properties: proto.v1.NoteDeleteRequest.$Shape): proto.v1.NoteDeleteRequest & proto.v1.NoteDeleteRequest.$Shape;
            static create(properties?: proto.v1.NoteDeleteRequest.$Properties): proto.v1.NoteDeleteRequest;

            /**
             * Encodes the specified NoteDeleteRequest message. Does not implicitly {@link proto.v1.NoteDeleteRequest.verify|verify} messages.
             * @param message NoteDeleteRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteDeleteRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteDeleteRequest message, length delimited. Does not implicitly {@link proto.v1.NoteDeleteRequest.verify|verify} messages.
             * @param message NoteDeleteRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteDeleteRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteDeleteRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteDeleteRequest & proto.v1.NoteDeleteRequest.$Shape} NoteDeleteRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteDeleteRequest & proto.v1.NoteDeleteRequest.$Shape;

            /**
             * Decodes a NoteDeleteRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteDeleteRequest & proto.v1.NoteDeleteRequest.$Shape} NoteDeleteRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteDeleteRequest & proto.v1.NoteDeleteRequest.$Shape;

            /**
             * Verifies a NoteDeleteRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteDeleteRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteDeleteRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteDeleteRequest;

            /**
             * Creates a plain object from a NoteDeleteRequest message. Also converts values to other types if specified.
             * @param message NoteDeleteRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteDeleteRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteDeleteRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteDeleteRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteDeleteRequest {

            /** Properties of a NoteDeleteRequest. */
            interface $Properties {

                /** NoteDeleteRequest vault */
                vault?: (string|null);

                /** NoteDeleteRequest path */
                path?: (string|null);

                /** NoteDeleteRequest pathHash */
                pathHash?: (string|null);

                /** NoteDeleteRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteDeleteRequest. */
            type $Shape = proto.v1.NoteDeleteRequest.$Properties;
        }

        /**
         * Properties of a NoteRenameRequest.
         * @deprecated Use proto.v1.NoteRenameRequest.$Properties instead.
         */
        type INoteRenameRequest = proto.v1.NoteRenameRequest.$Properties;

        /** Represents a NoteRenameRequest. */
        class NoteRenameRequest {

            /**
             * Constructs a new NoteRenameRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteRenameRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteRenameRequest vault. */
            vault: string;

            /** NoteRenameRequest path. */
            path: string;

            /** NoteRenameRequest pathHash. */
            pathHash: string;

            /** NoteRenameRequest oldPath. */
            oldPath: string;

            /** NoteRenameRequest oldPathHash. */
            oldPathHash: string;

            /** NoteRenameRequest context. */
            context: string;

            /**
             * Creates a new NoteRenameRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteRenameRequest instance
             */
            static create(properties: proto.v1.NoteRenameRequest.$Shape): proto.v1.NoteRenameRequest & proto.v1.NoteRenameRequest.$Shape;
            static create(properties?: proto.v1.NoteRenameRequest.$Properties): proto.v1.NoteRenameRequest;

            /**
             * Encodes the specified NoteRenameRequest message. Does not implicitly {@link proto.v1.NoteRenameRequest.verify|verify} messages.
             * @param message NoteRenameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteRenameRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteRenameRequest message, length delimited. Does not implicitly {@link proto.v1.NoteRenameRequest.verify|verify} messages.
             * @param message NoteRenameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteRenameRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteRenameRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteRenameRequest & proto.v1.NoteRenameRequest.$Shape} NoteRenameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteRenameRequest & proto.v1.NoteRenameRequest.$Shape;

            /**
             * Decodes a NoteRenameRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteRenameRequest & proto.v1.NoteRenameRequest.$Shape} NoteRenameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteRenameRequest & proto.v1.NoteRenameRequest.$Shape;

            /**
             * Verifies a NoteRenameRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteRenameRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteRenameRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteRenameRequest;

            /**
             * Creates a plain object from a NoteRenameRequest message. Also converts values to other types if specified.
             * @param message NoteRenameRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteRenameRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteRenameRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteRenameRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteRenameRequest {

            /** Properties of a NoteRenameRequest. */
            interface $Properties {

                /** NoteRenameRequest vault */
                vault?: (string|null);

                /** NoteRenameRequest path */
                path?: (string|null);

                /** NoteRenameRequest pathHash */
                pathHash?: (string|null);

                /** NoteRenameRequest oldPath */
                oldPath?: (string|null);

                /** NoteRenameRequest oldPathHash */
                oldPathHash?: (string|null);

                /** NoteRenameRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteRenameRequest. */
            type $Shape = proto.v1.NoteRenameRequest.$Properties;
        }

        /**
         * Properties of a NoteGetRequest.
         * @deprecated Use proto.v1.NoteGetRequest.$Properties instead.
         */
        type INoteGetRequest = proto.v1.NoteGetRequest.$Properties;

        /** Represents a NoteGetRequest. */
        class NoteGetRequest {

            /**
             * Constructs a new NoteGetRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteGetRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteGetRequest vault. */
            vault: string;

            /** NoteGetRequest path. */
            path: string;

            /** NoteGetRequest pathHash. */
            pathHash: string;

            /** NoteGetRequest isRecycle. */
            isRecycle: boolean;

            /**
             * Creates a new NoteGetRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteGetRequest instance
             */
            static create(properties: proto.v1.NoteGetRequest.$Shape): proto.v1.NoteGetRequest & proto.v1.NoteGetRequest.$Shape;
            static create(properties?: proto.v1.NoteGetRequest.$Properties): proto.v1.NoteGetRequest;

            /**
             * Encodes the specified NoteGetRequest message. Does not implicitly {@link proto.v1.NoteGetRequest.verify|verify} messages.
             * @param message NoteGetRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteGetRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteGetRequest message, length delimited. Does not implicitly {@link proto.v1.NoteGetRequest.verify|verify} messages.
             * @param message NoteGetRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteGetRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteGetRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteGetRequest & proto.v1.NoteGetRequest.$Shape} NoteGetRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteGetRequest & proto.v1.NoteGetRequest.$Shape;

            /**
             * Decodes a NoteGetRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteGetRequest & proto.v1.NoteGetRequest.$Shape} NoteGetRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteGetRequest & proto.v1.NoteGetRequest.$Shape;

            /**
             * Verifies a NoteGetRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteGetRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteGetRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteGetRequest;

            /**
             * Creates a plain object from a NoteGetRequest message. Also converts values to other types if specified.
             * @param message NoteGetRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteGetRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteGetRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteGetRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteGetRequest {

            /** Properties of a NoteGetRequest. */
            interface $Properties {

                /** NoteGetRequest vault */
                vault?: (string|null);

                /** NoteGetRequest path */
                path?: (string|null);

                /** NoteGetRequest pathHash */
                pathHash?: (string|null);

                /** NoteGetRequest isRecycle */
                isRecycle?: (boolean|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteGetRequest. */
            type $Shape = proto.v1.NoteGetRequest.$Properties;
        }

        /**
         * Properties of a NoteSyncModifyMessage.
         * @deprecated Use proto.v1.NoteSyncModifyMessage.$Properties instead.
         */
        type INoteSyncModifyMessage = proto.v1.NoteSyncModifyMessage.$Properties;

        /** Represents a NoteSyncModifyMessage. */
        class NoteSyncModifyMessage {

            /**
             * Constructs a new NoteSyncModifyMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncModifyMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncModifyMessage path. */
            path: string;

            /** NoteSyncModifyMessage pathHash. */
            pathHash: string;

            /** NoteSyncModifyMessage content. */
            content: string;

            /** NoteSyncModifyMessage contentHash. */
            contentHash: string;

            /** NoteSyncModifyMessage ctime. */
            ctime: (number|Long);

            /** NoteSyncModifyMessage mtime. */
            mtime: (number|Long);

            /** NoteSyncModifyMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new NoteSyncModifyMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncModifyMessage instance
             */
            static create(properties: proto.v1.NoteSyncModifyMessage.$Shape): proto.v1.NoteSyncModifyMessage & proto.v1.NoteSyncModifyMessage.$Shape;
            static create(properties?: proto.v1.NoteSyncModifyMessage.$Properties): proto.v1.NoteSyncModifyMessage;

            /**
             * Encodes the specified NoteSyncModifyMessage message. Does not implicitly {@link proto.v1.NoteSyncModifyMessage.verify|verify} messages.
             * @param message NoteSyncModifyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncModifyMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncModifyMessage message, length delimited. Does not implicitly {@link proto.v1.NoteSyncModifyMessage.verify|verify} messages.
             * @param message NoteSyncModifyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncModifyMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncModifyMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncModifyMessage & proto.v1.NoteSyncModifyMessage.$Shape} NoteSyncModifyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncModifyMessage & proto.v1.NoteSyncModifyMessage.$Shape;

            /**
             * Decodes a NoteSyncModifyMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncModifyMessage & proto.v1.NoteSyncModifyMessage.$Shape} NoteSyncModifyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncModifyMessage & proto.v1.NoteSyncModifyMessage.$Shape;

            /**
             * Verifies a NoteSyncModifyMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncModifyMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncModifyMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncModifyMessage;

            /**
             * Creates a plain object from a NoteSyncModifyMessage message. Also converts values to other types if specified.
             * @param message NoteSyncModifyMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncModifyMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncModifyMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncModifyMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncModifyMessage {

            /** Properties of a NoteSyncModifyMessage. */
            interface $Properties {

                /** NoteSyncModifyMessage path */
                path?: (string|null);

                /** NoteSyncModifyMessage pathHash */
                pathHash?: (string|null);

                /** NoteSyncModifyMessage content */
                content?: (string|null);

                /** NoteSyncModifyMessage contentHash */
                contentHash?: (string|null);

                /** NoteSyncModifyMessage ctime */
                ctime?: (number|Long|null);

                /** NoteSyncModifyMessage mtime */
                mtime?: (number|Long|null);

                /** NoteSyncModifyMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncModifyMessage. */
            type $Shape = proto.v1.NoteSyncModifyMessage.$Properties;
        }

        /**
         * Properties of a NoteSyncDeleteMessage.
         * @deprecated Use proto.v1.NoteSyncDeleteMessage.$Properties instead.
         */
        type INoteSyncDeleteMessage = proto.v1.NoteSyncDeleteMessage.$Properties;

        /** Represents a NoteSyncDeleteMessage. */
        class NoteSyncDeleteMessage {

            /**
             * Constructs a new NoteSyncDeleteMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncDeleteMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncDeleteMessage path. */
            path: string;

            /** NoteSyncDeleteMessage pathHash. */
            pathHash: string;

            /** NoteSyncDeleteMessage ctime. */
            ctime: (number|Long);

            /** NoteSyncDeleteMessage mtime. */
            mtime: (number|Long);

            /** NoteSyncDeleteMessage size. */
            size: (number|Long);

            /** NoteSyncDeleteMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new NoteSyncDeleteMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncDeleteMessage instance
             */
            static create(properties: proto.v1.NoteSyncDeleteMessage.$Shape): proto.v1.NoteSyncDeleteMessage & proto.v1.NoteSyncDeleteMessage.$Shape;
            static create(properties?: proto.v1.NoteSyncDeleteMessage.$Properties): proto.v1.NoteSyncDeleteMessage;

            /**
             * Encodes the specified NoteSyncDeleteMessage message. Does not implicitly {@link proto.v1.NoteSyncDeleteMessage.verify|verify} messages.
             * @param message NoteSyncDeleteMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncDeleteMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncDeleteMessage message, length delimited. Does not implicitly {@link proto.v1.NoteSyncDeleteMessage.verify|verify} messages.
             * @param message NoteSyncDeleteMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncDeleteMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncDeleteMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncDeleteMessage & proto.v1.NoteSyncDeleteMessage.$Shape} NoteSyncDeleteMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncDeleteMessage & proto.v1.NoteSyncDeleteMessage.$Shape;

            /**
             * Decodes a NoteSyncDeleteMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncDeleteMessage & proto.v1.NoteSyncDeleteMessage.$Shape} NoteSyncDeleteMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncDeleteMessage & proto.v1.NoteSyncDeleteMessage.$Shape;

            /**
             * Verifies a NoteSyncDeleteMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncDeleteMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncDeleteMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncDeleteMessage;

            /**
             * Creates a plain object from a NoteSyncDeleteMessage message. Also converts values to other types if specified.
             * @param message NoteSyncDeleteMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncDeleteMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncDeleteMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncDeleteMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncDeleteMessage {

            /** Properties of a NoteSyncDeleteMessage. */
            interface $Properties {

                /** NoteSyncDeleteMessage path */
                path?: (string|null);

                /** NoteSyncDeleteMessage pathHash */
                pathHash?: (string|null);

                /** NoteSyncDeleteMessage ctime */
                ctime?: (number|Long|null);

                /** NoteSyncDeleteMessage mtime */
                mtime?: (number|Long|null);

                /** NoteSyncDeleteMessage size */
                size?: (number|Long|null);

                /** NoteSyncDeleteMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncDeleteMessage. */
            type $Shape = proto.v1.NoteSyncDeleteMessage.$Properties;
        }

        /**
         * Properties of a NoteSyncRenameMessage.
         * @deprecated Use proto.v1.NoteSyncRenameMessage.$Properties instead.
         */
        type INoteSyncRenameMessage = proto.v1.NoteSyncRenameMessage.$Properties;

        /** Represents a NoteSyncRenameMessage. */
        class NoteSyncRenameMessage {

            /**
             * Constructs a new NoteSyncRenameMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncRenameMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncRenameMessage path. */
            path: string;

            /** NoteSyncRenameMessage pathHash. */
            pathHash: string;

            /** NoteSyncRenameMessage contentHash. */
            contentHash: string;

            /** NoteSyncRenameMessage ctime. */
            ctime: (number|Long);

            /** NoteSyncRenameMessage mtime. */
            mtime: (number|Long);

            /** NoteSyncRenameMessage size. */
            size: (number|Long);

            /** NoteSyncRenameMessage oldPath. */
            oldPath: string;

            /** NoteSyncRenameMessage oldPathHash. */
            oldPathHash: string;

            /** NoteSyncRenameMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new NoteSyncRenameMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncRenameMessage instance
             */
            static create(properties: proto.v1.NoteSyncRenameMessage.$Shape): proto.v1.NoteSyncRenameMessage & proto.v1.NoteSyncRenameMessage.$Shape;
            static create(properties?: proto.v1.NoteSyncRenameMessage.$Properties): proto.v1.NoteSyncRenameMessage;

            /**
             * Encodes the specified NoteSyncRenameMessage message. Does not implicitly {@link proto.v1.NoteSyncRenameMessage.verify|verify} messages.
             * @param message NoteSyncRenameMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncRenameMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncRenameMessage message, length delimited. Does not implicitly {@link proto.v1.NoteSyncRenameMessage.verify|verify} messages.
             * @param message NoteSyncRenameMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncRenameMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncRenameMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncRenameMessage & proto.v1.NoteSyncRenameMessage.$Shape} NoteSyncRenameMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncRenameMessage & proto.v1.NoteSyncRenameMessage.$Shape;

            /**
             * Decodes a NoteSyncRenameMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncRenameMessage & proto.v1.NoteSyncRenameMessage.$Shape} NoteSyncRenameMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncRenameMessage & proto.v1.NoteSyncRenameMessage.$Shape;

            /**
             * Verifies a NoteSyncRenameMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncRenameMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncRenameMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncRenameMessage;

            /**
             * Creates a plain object from a NoteSyncRenameMessage message. Also converts values to other types if specified.
             * @param message NoteSyncRenameMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncRenameMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncRenameMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncRenameMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncRenameMessage {

            /** Properties of a NoteSyncRenameMessage. */
            interface $Properties {

                /** NoteSyncRenameMessage path */
                path?: (string|null);

                /** NoteSyncRenameMessage pathHash */
                pathHash?: (string|null);

                /** NoteSyncRenameMessage contentHash */
                contentHash?: (string|null);

                /** NoteSyncRenameMessage ctime */
                ctime?: (number|Long|null);

                /** NoteSyncRenameMessage mtime */
                mtime?: (number|Long|null);

                /** NoteSyncRenameMessage size */
                size?: (number|Long|null);

                /** NoteSyncRenameMessage oldPath */
                oldPath?: (string|null);

                /** NoteSyncRenameMessage oldPathHash */
                oldPathHash?: (string|null);

                /** NoteSyncRenameMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncRenameMessage. */
            type $Shape = proto.v1.NoteSyncRenameMessage.$Properties;
        }

        /**
         * Properties of a NoteSyncMtimeMessage.
         * @deprecated Use proto.v1.NoteSyncMtimeMessage.$Properties instead.
         */
        type INoteSyncMtimeMessage = proto.v1.NoteSyncMtimeMessage.$Properties;

        /** Represents a NoteSyncMtimeMessage. */
        class NoteSyncMtimeMessage {

            /**
             * Constructs a new NoteSyncMtimeMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncMtimeMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncMtimeMessage path. */
            path: string;

            /** NoteSyncMtimeMessage ctime. */
            ctime: (number|Long);

            /** NoteSyncMtimeMessage mtime. */
            mtime: (number|Long);

            /** NoteSyncMtimeMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new NoteSyncMtimeMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncMtimeMessage instance
             */
            static create(properties: proto.v1.NoteSyncMtimeMessage.$Shape): proto.v1.NoteSyncMtimeMessage & proto.v1.NoteSyncMtimeMessage.$Shape;
            static create(properties?: proto.v1.NoteSyncMtimeMessage.$Properties): proto.v1.NoteSyncMtimeMessage;

            /**
             * Encodes the specified NoteSyncMtimeMessage message. Does not implicitly {@link proto.v1.NoteSyncMtimeMessage.verify|verify} messages.
             * @param message NoteSyncMtimeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncMtimeMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncMtimeMessage message, length delimited. Does not implicitly {@link proto.v1.NoteSyncMtimeMessage.verify|verify} messages.
             * @param message NoteSyncMtimeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncMtimeMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncMtimeMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncMtimeMessage & proto.v1.NoteSyncMtimeMessage.$Shape} NoteSyncMtimeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncMtimeMessage & proto.v1.NoteSyncMtimeMessage.$Shape;

            /**
             * Decodes a NoteSyncMtimeMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncMtimeMessage & proto.v1.NoteSyncMtimeMessage.$Shape} NoteSyncMtimeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncMtimeMessage & proto.v1.NoteSyncMtimeMessage.$Shape;

            /**
             * Verifies a NoteSyncMtimeMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncMtimeMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncMtimeMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncMtimeMessage;

            /**
             * Creates a plain object from a NoteSyncMtimeMessage message. Also converts values to other types if specified.
             * @param message NoteSyncMtimeMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncMtimeMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncMtimeMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncMtimeMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncMtimeMessage {

            /** Properties of a NoteSyncMtimeMessage. */
            interface $Properties {

                /** NoteSyncMtimeMessage path */
                path?: (string|null);

                /** NoteSyncMtimeMessage ctime */
                ctime?: (number|Long|null);

                /** NoteSyncMtimeMessage mtime */
                mtime?: (number|Long|null);

                /** NoteSyncMtimeMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncMtimeMessage. */
            type $Shape = proto.v1.NoteSyncMtimeMessage.$Properties;
        }

        /**
         * Properties of a NoteSyncEndMessage.
         * @deprecated Use proto.v1.NoteSyncEndMessage.$Properties instead.
         */
        type INoteSyncEndMessage = proto.v1.NoteSyncEndMessage.$Properties;

        /** Represents a NoteSyncEndMessage. */
        class NoteSyncEndMessage {

            /**
             * Constructs a new NoteSyncEndMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncEndMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncEndMessage lastTime. */
            lastTime: (number|Long);

            /** NoteSyncEndMessage needUploadCount. */
            needUploadCount: (number|Long);

            /** NoteSyncEndMessage needModifyCount. */
            needModifyCount: (number|Long);

            /** NoteSyncEndMessage needSyncMtimeCount. */
            needSyncMtimeCount: (number|Long);

            /** NoteSyncEndMessage needDeleteCount. */
            needDeleteCount: (number|Long);

            /**
             * Creates a new NoteSyncEndMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncEndMessage instance
             */
            static create(properties: proto.v1.NoteSyncEndMessage.$Shape): proto.v1.NoteSyncEndMessage & proto.v1.NoteSyncEndMessage.$Shape;
            static create(properties?: proto.v1.NoteSyncEndMessage.$Properties): proto.v1.NoteSyncEndMessage;

            /**
             * Encodes the specified NoteSyncEndMessage message. Does not implicitly {@link proto.v1.NoteSyncEndMessage.verify|verify} messages.
             * @param message NoteSyncEndMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncEndMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncEndMessage message, length delimited. Does not implicitly {@link proto.v1.NoteSyncEndMessage.verify|verify} messages.
             * @param message NoteSyncEndMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncEndMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncEndMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncEndMessage & proto.v1.NoteSyncEndMessage.$Shape} NoteSyncEndMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncEndMessage & proto.v1.NoteSyncEndMessage.$Shape;

            /**
             * Decodes a NoteSyncEndMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncEndMessage & proto.v1.NoteSyncEndMessage.$Shape} NoteSyncEndMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncEndMessage & proto.v1.NoteSyncEndMessage.$Shape;

            /**
             * Verifies a NoteSyncEndMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncEndMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncEndMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncEndMessage;

            /**
             * Creates a plain object from a NoteSyncEndMessage message. Also converts values to other types if specified.
             * @param message NoteSyncEndMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncEndMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncEndMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncEndMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncEndMessage {

            /** Properties of a NoteSyncEndMessage. */
            interface $Properties {

                /** NoteSyncEndMessage lastTime */
                lastTime?: (number|Long|null);

                /** NoteSyncEndMessage needUploadCount */
                needUploadCount?: (number|Long|null);

                /** NoteSyncEndMessage needModifyCount */
                needModifyCount?: (number|Long|null);

                /** NoteSyncEndMessage needSyncMtimeCount */
                needSyncMtimeCount?: (number|Long|null);

                /** NoteSyncEndMessage needDeleteCount */
                needDeleteCount?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncEndMessage. */
            type $Shape = proto.v1.NoteSyncEndMessage.$Properties;
        }

        /**
         * Properties of a NoteSyncNeedPushMessage.
         * @deprecated Use proto.v1.NoteSyncNeedPushMessage.$Properties instead.
         */
        type INoteSyncNeedPushMessage = proto.v1.NoteSyncNeedPushMessage.$Properties;

        /** Represents a NoteSyncNeedPushMessage. */
        class NoteSyncNeedPushMessage {

            /**
             * Constructs a new NoteSyncNeedPushMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncNeedPushMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncNeedPushMessage path. */
            path: string;

            /** NoteSyncNeedPushMessage pathHash. */
            pathHash: string;

            /** NoteSyncNeedPushMessage serverContent. */
            serverContent: string;

            /** NoteSyncNeedPushMessage baseContent. */
            baseContent: string;

            /** NoteSyncNeedPushMessage serverHash. */
            serverHash: string;

            /**
             * Creates a new NoteSyncNeedPushMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncNeedPushMessage instance
             */
            static create(properties: proto.v1.NoteSyncNeedPushMessage.$Shape): proto.v1.NoteSyncNeedPushMessage & proto.v1.NoteSyncNeedPushMessage.$Shape;
            static create(properties?: proto.v1.NoteSyncNeedPushMessage.$Properties): proto.v1.NoteSyncNeedPushMessage;

            /**
             * Encodes the specified NoteSyncNeedPushMessage message. Does not implicitly {@link proto.v1.NoteSyncNeedPushMessage.verify|verify} messages.
             * @param message NoteSyncNeedPushMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncNeedPushMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncNeedPushMessage message, length delimited. Does not implicitly {@link proto.v1.NoteSyncNeedPushMessage.verify|verify} messages.
             * @param message NoteSyncNeedPushMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncNeedPushMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncNeedPushMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncNeedPushMessage & proto.v1.NoteSyncNeedPushMessage.$Shape} NoteSyncNeedPushMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncNeedPushMessage & proto.v1.NoteSyncNeedPushMessage.$Shape;

            /**
             * Decodes a NoteSyncNeedPushMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncNeedPushMessage & proto.v1.NoteSyncNeedPushMessage.$Shape} NoteSyncNeedPushMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncNeedPushMessage & proto.v1.NoteSyncNeedPushMessage.$Shape;

            /**
             * Verifies a NoteSyncNeedPushMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncNeedPushMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncNeedPushMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncNeedPushMessage;

            /**
             * Creates a plain object from a NoteSyncNeedPushMessage message. Also converts values to other types if specified.
             * @param message NoteSyncNeedPushMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncNeedPushMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncNeedPushMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncNeedPushMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncNeedPushMessage {

            /** Properties of a NoteSyncNeedPushMessage. */
            interface $Properties {

                /** NoteSyncNeedPushMessage path */
                path?: (string|null);

                /** NoteSyncNeedPushMessage pathHash */
                pathHash?: (string|null);

                /** NoteSyncNeedPushMessage serverContent */
                serverContent?: (string|null);

                /** NoteSyncNeedPushMessage baseContent */
                baseContent?: (string|null);

                /** NoteSyncNeedPushMessage serverHash */
                serverHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncNeedPushMessage. */
            type $Shape = proto.v1.NoteSyncNeedPushMessage.$Properties;
        }

        /**
         * Properties of a NoteModifyAckMessage.
         * @deprecated Use proto.v1.NoteModifyAckMessage.$Properties instead.
         */
        type INoteModifyAckMessage = proto.v1.NoteModifyAckMessage.$Properties;

        /** Represents a NoteModifyAckMessage. */
        class NoteModifyAckMessage {

            /**
             * Constructs a new NoteModifyAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteModifyAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteModifyAckMessage lastTime. */
            lastTime: (number|Long);

            /** NoteModifyAckMessage path. */
            path: string;

            /** NoteModifyAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new NoteModifyAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteModifyAckMessage instance
             */
            static create(properties: proto.v1.NoteModifyAckMessage.$Shape): proto.v1.NoteModifyAckMessage & proto.v1.NoteModifyAckMessage.$Shape;
            static create(properties?: proto.v1.NoteModifyAckMessage.$Properties): proto.v1.NoteModifyAckMessage;

            /**
             * Encodes the specified NoteModifyAckMessage message. Does not implicitly {@link proto.v1.NoteModifyAckMessage.verify|verify} messages.
             * @param message NoteModifyAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteModifyAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteModifyAckMessage message, length delimited. Does not implicitly {@link proto.v1.NoteModifyAckMessage.verify|verify} messages.
             * @param message NoteModifyAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteModifyAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteModifyAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteModifyAckMessage & proto.v1.NoteModifyAckMessage.$Shape} NoteModifyAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteModifyAckMessage & proto.v1.NoteModifyAckMessage.$Shape;

            /**
             * Decodes a NoteModifyAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteModifyAckMessage & proto.v1.NoteModifyAckMessage.$Shape} NoteModifyAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteModifyAckMessage & proto.v1.NoteModifyAckMessage.$Shape;

            /**
             * Verifies a NoteModifyAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteModifyAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteModifyAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteModifyAckMessage;

            /**
             * Creates a plain object from a NoteModifyAckMessage message. Also converts values to other types if specified.
             * @param message NoteModifyAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteModifyAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteModifyAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteModifyAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteModifyAckMessage {

            /** Properties of a NoteModifyAckMessage. */
            interface $Properties {

                /** NoteModifyAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** NoteModifyAckMessage path */
                path?: (string|null);

                /** NoteModifyAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteModifyAckMessage. */
            type $Shape = proto.v1.NoteModifyAckMessage.$Properties;
        }

        /**
         * Properties of a NoteRenameAckMessage.
         * @deprecated Use proto.v1.NoteRenameAckMessage.$Properties instead.
         */
        type INoteRenameAckMessage = proto.v1.NoteRenameAckMessage.$Properties;

        /** Represents a NoteRenameAckMessage. */
        class NoteRenameAckMessage {

            /**
             * Constructs a new NoteRenameAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteRenameAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteRenameAckMessage lastTime. */
            lastTime: (number|Long);

            /** NoteRenameAckMessage path. */
            path: string;

            /** NoteRenameAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new NoteRenameAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteRenameAckMessage instance
             */
            static create(properties: proto.v1.NoteRenameAckMessage.$Shape): proto.v1.NoteRenameAckMessage & proto.v1.NoteRenameAckMessage.$Shape;
            static create(properties?: proto.v1.NoteRenameAckMessage.$Properties): proto.v1.NoteRenameAckMessage;

            /**
             * Encodes the specified NoteRenameAckMessage message. Does not implicitly {@link proto.v1.NoteRenameAckMessage.verify|verify} messages.
             * @param message NoteRenameAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteRenameAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteRenameAckMessage message, length delimited. Does not implicitly {@link proto.v1.NoteRenameAckMessage.verify|verify} messages.
             * @param message NoteRenameAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteRenameAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteRenameAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteRenameAckMessage & proto.v1.NoteRenameAckMessage.$Shape} NoteRenameAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteRenameAckMessage & proto.v1.NoteRenameAckMessage.$Shape;

            /**
             * Decodes a NoteRenameAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteRenameAckMessage & proto.v1.NoteRenameAckMessage.$Shape} NoteRenameAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteRenameAckMessage & proto.v1.NoteRenameAckMessage.$Shape;

            /**
             * Verifies a NoteRenameAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteRenameAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteRenameAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteRenameAckMessage;

            /**
             * Creates a plain object from a NoteRenameAckMessage message. Also converts values to other types if specified.
             * @param message NoteRenameAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteRenameAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteRenameAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteRenameAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteRenameAckMessage {

            /** Properties of a NoteRenameAckMessage. */
            interface $Properties {

                /** NoteRenameAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** NoteRenameAckMessage path */
                path?: (string|null);

                /** NoteRenameAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteRenameAckMessage. */
            type $Shape = proto.v1.NoteRenameAckMessage.$Properties;
        }

        /**
         * Properties of a NoteDeleteAckMessage.
         * @deprecated Use proto.v1.NoteDeleteAckMessage.$Properties instead.
         */
        type INoteDeleteAckMessage = proto.v1.NoteDeleteAckMessage.$Properties;

        /** Represents a NoteDeleteAckMessage. */
        class NoteDeleteAckMessage {

            /**
             * Constructs a new NoteDeleteAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteDeleteAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteDeleteAckMessage lastTime. */
            lastTime: (number|Long);

            /** NoteDeleteAckMessage path. */
            path: string;

            /** NoteDeleteAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new NoteDeleteAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteDeleteAckMessage instance
             */
            static create(properties: proto.v1.NoteDeleteAckMessage.$Shape): proto.v1.NoteDeleteAckMessage & proto.v1.NoteDeleteAckMessage.$Shape;
            static create(properties?: proto.v1.NoteDeleteAckMessage.$Properties): proto.v1.NoteDeleteAckMessage;

            /**
             * Encodes the specified NoteDeleteAckMessage message. Does not implicitly {@link proto.v1.NoteDeleteAckMessage.verify|verify} messages.
             * @param message NoteDeleteAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteDeleteAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteDeleteAckMessage message, length delimited. Does not implicitly {@link proto.v1.NoteDeleteAckMessage.verify|verify} messages.
             * @param message NoteDeleteAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteDeleteAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteDeleteAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteDeleteAckMessage & proto.v1.NoteDeleteAckMessage.$Shape} NoteDeleteAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteDeleteAckMessage & proto.v1.NoteDeleteAckMessage.$Shape;

            /**
             * Decodes a NoteDeleteAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteDeleteAckMessage & proto.v1.NoteDeleteAckMessage.$Shape} NoteDeleteAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteDeleteAckMessage & proto.v1.NoteDeleteAckMessage.$Shape;

            /**
             * Verifies a NoteDeleteAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteDeleteAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteDeleteAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteDeleteAckMessage;

            /**
             * Creates a plain object from a NoteDeleteAckMessage message. Also converts values to other types if specified.
             * @param message NoteDeleteAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteDeleteAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteDeleteAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteDeleteAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteDeleteAckMessage {

            /** Properties of a NoteDeleteAckMessage. */
            interface $Properties {

                /** NoteDeleteAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** NoteDeleteAckMessage path */
                path?: (string|null);

                /** NoteDeleteAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteDeleteAckMessage. */
            type $Shape = proto.v1.NoteDeleteAckMessage.$Properties;
        }

        /**
         * Properties of a FileSyncRequest.
         * @deprecated Use proto.v1.FileSyncRequest.$Properties instead.
         */
        type IFileSyncRequest = proto.v1.FileSyncRequest.$Properties;

        /** Represents a FileSyncRequest. */
        class FileSyncRequest {

            /**
             * Constructs a new FileSyncRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncRequest context. */
            context: string;

            /** FileSyncRequest vault. */
            vault: string;

            /** FileSyncRequest lastTime. */
            lastTime: (number|Long);

            /** FileSyncRequest files. */
            files: proto.v1.FileSyncCheckRequest.$Properties[];

            /** FileSyncRequest delFiles. */
            delFiles: proto.v1.FileSyncDelFile.$Properties[];

            /** FileSyncRequest missingFiles. */
            missingFiles: proto.v1.FileSyncDelFile.$Properties[];

            /** FileSyncRequest batchIndex. */
            batchIndex: number;

            /** FileSyncRequest totalBatches. */
            totalBatches: number;

            /**
             * Creates a new FileSyncRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncRequest instance
             */
            static create(properties: proto.v1.FileSyncRequest.$Shape): proto.v1.FileSyncRequest & proto.v1.FileSyncRequest.$Shape;
            static create(properties?: proto.v1.FileSyncRequest.$Properties): proto.v1.FileSyncRequest;

            /**
             * Encodes the specified FileSyncRequest message. Does not implicitly {@link proto.v1.FileSyncRequest.verify|verify} messages.
             * @param message FileSyncRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncRequest message, length delimited. Does not implicitly {@link proto.v1.FileSyncRequest.verify|verify} messages.
             * @param message FileSyncRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncRequest & proto.v1.FileSyncRequest.$Shape} FileSyncRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncRequest & proto.v1.FileSyncRequest.$Shape;

            /**
             * Decodes a FileSyncRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncRequest & proto.v1.FileSyncRequest.$Shape} FileSyncRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncRequest & proto.v1.FileSyncRequest.$Shape;

            /**
             * Verifies a FileSyncRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncRequest;

            /**
             * Creates a plain object from a FileSyncRequest message. Also converts values to other types if specified.
             * @param message FileSyncRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncRequest {

            /** Properties of a FileSyncRequest. */
            interface $Properties {

                /** FileSyncRequest context */
                context?: (string|null);

                /** FileSyncRequest vault */
                vault?: (string|null);

                /** FileSyncRequest lastTime */
                lastTime?: (number|Long|null);

                /** FileSyncRequest files */
                files?: (proto.v1.FileSyncCheckRequest.$Properties[]|null);

                /** FileSyncRequest delFiles */
                delFiles?: (proto.v1.FileSyncDelFile.$Properties[]|null);

                /** FileSyncRequest missingFiles */
                missingFiles?: (proto.v1.FileSyncDelFile.$Properties[]|null);

                /** FileSyncRequest batchIndex */
                batchIndex?: (number|null);

                /** FileSyncRequest totalBatches */
                totalBatches?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncRequest. */
            type $Shape = proto.v1.FileSyncRequest.$Properties;
        }

        /**
         * Properties of a FileSyncCheckRequest.
         * @deprecated Use proto.v1.FileSyncCheckRequest.$Properties instead.
         */
        type IFileSyncCheckRequest = proto.v1.FileSyncCheckRequest.$Properties;

        /** Represents a FileSyncCheckRequest. */
        class FileSyncCheckRequest {

            /**
             * Constructs a new FileSyncCheckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncCheckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncCheckRequest path. */
            path: string;

            /** FileSyncCheckRequest pathHash. */
            pathHash: string;

            /** FileSyncCheckRequest contentHash. */
            contentHash: string;

            /** FileSyncCheckRequest size. */
            size: (number|Long);

            /** FileSyncCheckRequest mtime. */
            mtime: (number|Long);

            /** FileSyncCheckRequest ctime. */
            ctime: (number|Long);

            /**
             * Creates a new FileSyncCheckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncCheckRequest instance
             */
            static create(properties: proto.v1.FileSyncCheckRequest.$Shape): proto.v1.FileSyncCheckRequest & proto.v1.FileSyncCheckRequest.$Shape;
            static create(properties?: proto.v1.FileSyncCheckRequest.$Properties): proto.v1.FileSyncCheckRequest;

            /**
             * Encodes the specified FileSyncCheckRequest message. Does not implicitly {@link proto.v1.FileSyncCheckRequest.verify|verify} messages.
             * @param message FileSyncCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncCheckRequest message, length delimited. Does not implicitly {@link proto.v1.FileSyncCheckRequest.verify|verify} messages.
             * @param message FileSyncCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncCheckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncCheckRequest & proto.v1.FileSyncCheckRequest.$Shape} FileSyncCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncCheckRequest & proto.v1.FileSyncCheckRequest.$Shape;

            /**
             * Decodes a FileSyncCheckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncCheckRequest & proto.v1.FileSyncCheckRequest.$Shape} FileSyncCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncCheckRequest & proto.v1.FileSyncCheckRequest.$Shape;

            /**
             * Verifies a FileSyncCheckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncCheckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncCheckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncCheckRequest;

            /**
             * Creates a plain object from a FileSyncCheckRequest message. Also converts values to other types if specified.
             * @param message FileSyncCheckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncCheckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncCheckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncCheckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncCheckRequest {

            /** Properties of a FileSyncCheckRequest. */
            interface $Properties {

                /** FileSyncCheckRequest path */
                path?: (string|null);

                /** FileSyncCheckRequest pathHash */
                pathHash?: (string|null);

                /** FileSyncCheckRequest contentHash */
                contentHash?: (string|null);

                /** FileSyncCheckRequest size */
                size?: (number|Long|null);

                /** FileSyncCheckRequest mtime */
                mtime?: (number|Long|null);

                /** FileSyncCheckRequest ctime */
                ctime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncCheckRequest. */
            type $Shape = proto.v1.FileSyncCheckRequest.$Properties;
        }

        /**
         * Properties of a FileSyncDelFile.
         * @deprecated Use proto.v1.FileSyncDelFile.$Properties instead.
         */
        type IFileSyncDelFile = proto.v1.FileSyncDelFile.$Properties;

        /** Represents a FileSyncDelFile. */
        class FileSyncDelFile {

            /**
             * Constructs a new FileSyncDelFile.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncDelFile.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncDelFile path. */
            path: string;

            /** FileSyncDelFile pathHash. */
            pathHash: string;

            /**
             * Creates a new FileSyncDelFile instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncDelFile instance
             */
            static create(properties: proto.v1.FileSyncDelFile.$Shape): proto.v1.FileSyncDelFile & proto.v1.FileSyncDelFile.$Shape;
            static create(properties?: proto.v1.FileSyncDelFile.$Properties): proto.v1.FileSyncDelFile;

            /**
             * Encodes the specified FileSyncDelFile message. Does not implicitly {@link proto.v1.FileSyncDelFile.verify|verify} messages.
             * @param message FileSyncDelFile message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncDelFile.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncDelFile message, length delimited. Does not implicitly {@link proto.v1.FileSyncDelFile.verify|verify} messages.
             * @param message FileSyncDelFile message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncDelFile.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncDelFile message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncDelFile & proto.v1.FileSyncDelFile.$Shape} FileSyncDelFile
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncDelFile & proto.v1.FileSyncDelFile.$Shape;

            /**
             * Decodes a FileSyncDelFile message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncDelFile & proto.v1.FileSyncDelFile.$Shape} FileSyncDelFile
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncDelFile & proto.v1.FileSyncDelFile.$Shape;

            /**
             * Verifies a FileSyncDelFile message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncDelFile message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncDelFile
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncDelFile;

            /**
             * Creates a plain object from a FileSyncDelFile message. Also converts values to other types if specified.
             * @param message FileSyncDelFile
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncDelFile, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncDelFile to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncDelFile
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncDelFile {

            /** Properties of a FileSyncDelFile. */
            interface $Properties {

                /** FileSyncDelFile path */
                path?: (string|null);

                /** FileSyncDelFile pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncDelFile. */
            type $Shape = proto.v1.FileSyncDelFile.$Properties;
        }

        /**
         * Properties of a FileUploadCheckRequest.
         * @deprecated Use proto.v1.FileUploadCheckRequest.$Properties instead.
         */
        type IFileUploadCheckRequest = proto.v1.FileUploadCheckRequest.$Properties;

        /** Represents a FileUploadCheckRequest. */
        class FileUploadCheckRequest {

            /**
             * Constructs a new FileUploadCheckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileUploadCheckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileUploadCheckRequest vault. */
            vault: string;

            /** FileUploadCheckRequest path. */
            path: string;

            /** FileUploadCheckRequest pathHash. */
            pathHash: string;

            /** FileUploadCheckRequest contentHash. */
            contentHash: string;

            /** FileUploadCheckRequest size. */
            size: (number|Long);

            /** FileUploadCheckRequest ctime. */
            ctime: (number|Long);

            /** FileUploadCheckRequest mtime. */
            mtime: (number|Long);

            /** FileUploadCheckRequest context. */
            context: string;

            /**
             * Creates a new FileUploadCheckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileUploadCheckRequest instance
             */
            static create(properties: proto.v1.FileUploadCheckRequest.$Shape): proto.v1.FileUploadCheckRequest & proto.v1.FileUploadCheckRequest.$Shape;
            static create(properties?: proto.v1.FileUploadCheckRequest.$Properties): proto.v1.FileUploadCheckRequest;

            /**
             * Encodes the specified FileUploadCheckRequest message. Does not implicitly {@link proto.v1.FileUploadCheckRequest.verify|verify} messages.
             * @param message FileUploadCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileUploadCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileUploadCheckRequest message, length delimited. Does not implicitly {@link proto.v1.FileUploadCheckRequest.verify|verify} messages.
             * @param message FileUploadCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileUploadCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileUploadCheckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileUploadCheckRequest & proto.v1.FileUploadCheckRequest.$Shape} FileUploadCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileUploadCheckRequest & proto.v1.FileUploadCheckRequest.$Shape;

            /**
             * Decodes a FileUploadCheckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileUploadCheckRequest & proto.v1.FileUploadCheckRequest.$Shape} FileUploadCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileUploadCheckRequest & proto.v1.FileUploadCheckRequest.$Shape;

            /**
             * Verifies a FileUploadCheckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileUploadCheckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileUploadCheckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileUploadCheckRequest;

            /**
             * Creates a plain object from a FileUploadCheckRequest message. Also converts values to other types if specified.
             * @param message FileUploadCheckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileUploadCheckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileUploadCheckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileUploadCheckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileUploadCheckRequest {

            /** Properties of a FileUploadCheckRequest. */
            interface $Properties {

                /** FileUploadCheckRequest vault */
                vault?: (string|null);

                /** FileUploadCheckRequest path */
                path?: (string|null);

                /** FileUploadCheckRequest pathHash */
                pathHash?: (string|null);

                /** FileUploadCheckRequest contentHash */
                contentHash?: (string|null);

                /** FileUploadCheckRequest size */
                size?: (number|Long|null);

                /** FileUploadCheckRequest ctime */
                ctime?: (number|Long|null);

                /** FileUploadCheckRequest mtime */
                mtime?: (number|Long|null);

                /** FileUploadCheckRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileUploadCheckRequest. */
            type $Shape = proto.v1.FileUploadCheckRequest.$Properties;
        }

        /**
         * Properties of a FileDeleteRequest.
         * @deprecated Use proto.v1.FileDeleteRequest.$Properties instead.
         */
        type IFileDeleteRequest = proto.v1.FileDeleteRequest.$Properties;

        /** Represents a FileDeleteRequest. */
        class FileDeleteRequest {

            /**
             * Constructs a new FileDeleteRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileDeleteRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileDeleteRequest vault. */
            vault: string;

            /** FileDeleteRequest path. */
            path: string;

            /** FileDeleteRequest pathHash. */
            pathHash: string;

            /** FileDeleteRequest context. */
            context: string;

            /**
             * Creates a new FileDeleteRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileDeleteRequest instance
             */
            static create(properties: proto.v1.FileDeleteRequest.$Shape): proto.v1.FileDeleteRequest & proto.v1.FileDeleteRequest.$Shape;
            static create(properties?: proto.v1.FileDeleteRequest.$Properties): proto.v1.FileDeleteRequest;

            /**
             * Encodes the specified FileDeleteRequest message. Does not implicitly {@link proto.v1.FileDeleteRequest.verify|verify} messages.
             * @param message FileDeleteRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileDeleteRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileDeleteRequest message, length delimited. Does not implicitly {@link proto.v1.FileDeleteRequest.verify|verify} messages.
             * @param message FileDeleteRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileDeleteRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileDeleteRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileDeleteRequest & proto.v1.FileDeleteRequest.$Shape} FileDeleteRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileDeleteRequest & proto.v1.FileDeleteRequest.$Shape;

            /**
             * Decodes a FileDeleteRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileDeleteRequest & proto.v1.FileDeleteRequest.$Shape} FileDeleteRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileDeleteRequest & proto.v1.FileDeleteRequest.$Shape;

            /**
             * Verifies a FileDeleteRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileDeleteRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileDeleteRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileDeleteRequest;

            /**
             * Creates a plain object from a FileDeleteRequest message. Also converts values to other types if specified.
             * @param message FileDeleteRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileDeleteRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileDeleteRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileDeleteRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileDeleteRequest {

            /** Properties of a FileDeleteRequest. */
            interface $Properties {

                /** FileDeleteRequest vault */
                vault?: (string|null);

                /** FileDeleteRequest path */
                path?: (string|null);

                /** FileDeleteRequest pathHash */
                pathHash?: (string|null);

                /** FileDeleteRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileDeleteRequest. */
            type $Shape = proto.v1.FileDeleteRequest.$Properties;
        }

        /**
         * Properties of a FileRenameRequest.
         * @deprecated Use proto.v1.FileRenameRequest.$Properties instead.
         */
        type IFileRenameRequest = proto.v1.FileRenameRequest.$Properties;

        /** Represents a FileRenameRequest. */
        class FileRenameRequest {

            /**
             * Constructs a new FileRenameRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileRenameRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileRenameRequest vault. */
            vault: string;

            /** FileRenameRequest path. */
            path: string;

            /** FileRenameRequest pathHash. */
            pathHash: string;

            /** FileRenameRequest oldPath. */
            oldPath: string;

            /** FileRenameRequest oldPathHash. */
            oldPathHash: string;

            /** FileRenameRequest context. */
            context: string;

            /**
             * Creates a new FileRenameRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileRenameRequest instance
             */
            static create(properties: proto.v1.FileRenameRequest.$Shape): proto.v1.FileRenameRequest & proto.v1.FileRenameRequest.$Shape;
            static create(properties?: proto.v1.FileRenameRequest.$Properties): proto.v1.FileRenameRequest;

            /**
             * Encodes the specified FileRenameRequest message. Does not implicitly {@link proto.v1.FileRenameRequest.verify|verify} messages.
             * @param message FileRenameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileRenameRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileRenameRequest message, length delimited. Does not implicitly {@link proto.v1.FileRenameRequest.verify|verify} messages.
             * @param message FileRenameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileRenameRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileRenameRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileRenameRequest & proto.v1.FileRenameRequest.$Shape} FileRenameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileRenameRequest & proto.v1.FileRenameRequest.$Shape;

            /**
             * Decodes a FileRenameRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileRenameRequest & proto.v1.FileRenameRequest.$Shape} FileRenameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileRenameRequest & proto.v1.FileRenameRequest.$Shape;

            /**
             * Verifies a FileRenameRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileRenameRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileRenameRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileRenameRequest;

            /**
             * Creates a plain object from a FileRenameRequest message. Also converts values to other types if specified.
             * @param message FileRenameRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileRenameRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileRenameRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileRenameRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileRenameRequest {

            /** Properties of a FileRenameRequest. */
            interface $Properties {

                /** FileRenameRequest vault */
                vault?: (string|null);

                /** FileRenameRequest path */
                path?: (string|null);

                /** FileRenameRequest pathHash */
                pathHash?: (string|null);

                /** FileRenameRequest oldPath */
                oldPath?: (string|null);

                /** FileRenameRequest oldPathHash */
                oldPathHash?: (string|null);

                /** FileRenameRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileRenameRequest. */
            type $Shape = proto.v1.FileRenameRequest.$Properties;
        }

        /**
         * Properties of a FileChunkDownloadRequest.
         * @deprecated Use proto.v1.FileChunkDownloadRequest.$Properties instead.
         */
        type IFileChunkDownloadRequest = proto.v1.FileChunkDownloadRequest.$Properties;

        /** Represents a FileChunkDownloadRequest. */
        class FileChunkDownloadRequest {

            /**
             * Constructs a new FileChunkDownloadRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileChunkDownloadRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileChunkDownloadRequest vault. */
            vault: string;

            /** FileChunkDownloadRequest path. */
            path: string;

            /** FileChunkDownloadRequest pathHash. */
            pathHash: string;

            /** FileChunkDownloadRequest sessionId. */
            sessionId: string;

            /** FileChunkDownloadRequest chunkIndex. */
            chunkIndex: (number|Long);

            /** FileChunkDownloadRequest context. */
            context: string;

            /**
             * Creates a new FileChunkDownloadRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileChunkDownloadRequest instance
             */
            static create(properties: proto.v1.FileChunkDownloadRequest.$Shape): proto.v1.FileChunkDownloadRequest & proto.v1.FileChunkDownloadRequest.$Shape;
            static create(properties?: proto.v1.FileChunkDownloadRequest.$Properties): proto.v1.FileChunkDownloadRequest;

            /**
             * Encodes the specified FileChunkDownloadRequest message. Does not implicitly {@link proto.v1.FileChunkDownloadRequest.verify|verify} messages.
             * @param message FileChunkDownloadRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileChunkDownloadRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileChunkDownloadRequest message, length delimited. Does not implicitly {@link proto.v1.FileChunkDownloadRequest.verify|verify} messages.
             * @param message FileChunkDownloadRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileChunkDownloadRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileChunkDownloadRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileChunkDownloadRequest & proto.v1.FileChunkDownloadRequest.$Shape} FileChunkDownloadRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileChunkDownloadRequest & proto.v1.FileChunkDownloadRequest.$Shape;

            /**
             * Decodes a FileChunkDownloadRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileChunkDownloadRequest & proto.v1.FileChunkDownloadRequest.$Shape} FileChunkDownloadRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileChunkDownloadRequest & proto.v1.FileChunkDownloadRequest.$Shape;

            /**
             * Verifies a FileChunkDownloadRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileChunkDownloadRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileChunkDownloadRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileChunkDownloadRequest;

            /**
             * Creates a plain object from a FileChunkDownloadRequest message. Also converts values to other types if specified.
             * @param message FileChunkDownloadRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileChunkDownloadRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileChunkDownloadRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileChunkDownloadRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileChunkDownloadRequest {

            /** Properties of a FileChunkDownloadRequest. */
            interface $Properties {

                /** FileChunkDownloadRequest vault */
                vault?: (string|null);

                /** FileChunkDownloadRequest path */
                path?: (string|null);

                /** FileChunkDownloadRequest pathHash */
                pathHash?: (string|null);

                /** FileChunkDownloadRequest sessionId */
                sessionId?: (string|null);

                /** FileChunkDownloadRequest chunkIndex */
                chunkIndex?: (number|Long|null);

                /** FileChunkDownloadRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileChunkDownloadRequest. */
            type $Shape = proto.v1.FileChunkDownloadRequest.$Properties;
        }

        /**
         * Properties of a FileGetRequest.
         * @deprecated Use proto.v1.FileGetRequest.$Properties instead.
         */
        type IFileGetRequest = proto.v1.FileGetRequest.$Properties;

        /** Represents a FileGetRequest. */
        class FileGetRequest {

            /**
             * Constructs a new FileGetRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileGetRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileGetRequest vault. */
            vault: string;

            /** FileGetRequest path. */
            path: string;

            /** FileGetRequest pathHash. */
            pathHash: string;

            /** FileGetRequest isRecycle. */
            isRecycle: boolean;

            /** FileGetRequest context. */
            context: string;

            /**
             * Creates a new FileGetRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileGetRequest instance
             */
            static create(properties: proto.v1.FileGetRequest.$Shape): proto.v1.FileGetRequest & proto.v1.FileGetRequest.$Shape;
            static create(properties?: proto.v1.FileGetRequest.$Properties): proto.v1.FileGetRequest;

            /**
             * Encodes the specified FileGetRequest message. Does not implicitly {@link proto.v1.FileGetRequest.verify|verify} messages.
             * @param message FileGetRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileGetRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileGetRequest message, length delimited. Does not implicitly {@link proto.v1.FileGetRequest.verify|verify} messages.
             * @param message FileGetRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileGetRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileGetRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileGetRequest & proto.v1.FileGetRequest.$Shape} FileGetRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileGetRequest & proto.v1.FileGetRequest.$Shape;

            /**
             * Decodes a FileGetRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileGetRequest & proto.v1.FileGetRequest.$Shape} FileGetRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileGetRequest & proto.v1.FileGetRequest.$Shape;

            /**
             * Verifies a FileGetRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileGetRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileGetRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileGetRequest;

            /**
             * Creates a plain object from a FileGetRequest message. Also converts values to other types if specified.
             * @param message FileGetRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileGetRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileGetRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileGetRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileGetRequest {

            /** Properties of a FileGetRequest. */
            interface $Properties {

                /** FileGetRequest vault */
                vault?: (string|null);

                /** FileGetRequest path */
                path?: (string|null);

                /** FileGetRequest pathHash */
                pathHash?: (string|null);

                /** FileGetRequest isRecycle */
                isRecycle?: (boolean|null);

                /** FileGetRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileGetRequest. */
            type $Shape = proto.v1.FileGetRequest.$Properties;
        }

        /**
         * Properties of a FileSyncModifyMessage.
         * @deprecated Use proto.v1.FileSyncModifyMessage.$Properties instead.
         */
        type IFileSyncModifyMessage = proto.v1.FileSyncModifyMessage.$Properties;

        /** Represents a FileSyncModifyMessage. */
        class FileSyncModifyMessage {

            /**
             * Constructs a new FileSyncModifyMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncModifyMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncModifyMessage path. */
            path: string;

            /** FileSyncModifyMessage pathHash. */
            pathHash: string;

            /** FileSyncModifyMessage contentHash. */
            contentHash: string;

            /** FileSyncModifyMessage size. */
            size: (number|Long);

            /** FileSyncModifyMessage ctime. */
            ctime: (number|Long);

            /** FileSyncModifyMessage mtime. */
            mtime: (number|Long);

            /** FileSyncModifyMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new FileSyncModifyMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncModifyMessage instance
             */
            static create(properties: proto.v1.FileSyncModifyMessage.$Shape): proto.v1.FileSyncModifyMessage & proto.v1.FileSyncModifyMessage.$Shape;
            static create(properties?: proto.v1.FileSyncModifyMessage.$Properties): proto.v1.FileSyncModifyMessage;

            /**
             * Encodes the specified FileSyncModifyMessage message. Does not implicitly {@link proto.v1.FileSyncModifyMessage.verify|verify} messages.
             * @param message FileSyncModifyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncModifyMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncModifyMessage message, length delimited. Does not implicitly {@link proto.v1.FileSyncModifyMessage.verify|verify} messages.
             * @param message FileSyncModifyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncModifyMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncModifyMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncModifyMessage & proto.v1.FileSyncModifyMessage.$Shape} FileSyncModifyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncModifyMessage & proto.v1.FileSyncModifyMessage.$Shape;

            /**
             * Decodes a FileSyncModifyMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncModifyMessage & proto.v1.FileSyncModifyMessage.$Shape} FileSyncModifyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncModifyMessage & proto.v1.FileSyncModifyMessage.$Shape;

            /**
             * Verifies a FileSyncModifyMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncModifyMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncModifyMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncModifyMessage;

            /**
             * Creates a plain object from a FileSyncModifyMessage message. Also converts values to other types if specified.
             * @param message FileSyncModifyMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncModifyMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncModifyMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncModifyMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncModifyMessage {

            /** Properties of a FileSyncModifyMessage. */
            interface $Properties {

                /** FileSyncModifyMessage path */
                path?: (string|null);

                /** FileSyncModifyMessage pathHash */
                pathHash?: (string|null);

                /** FileSyncModifyMessage contentHash */
                contentHash?: (string|null);

                /** FileSyncModifyMessage size */
                size?: (number|Long|null);

                /** FileSyncModifyMessage ctime */
                ctime?: (number|Long|null);

                /** FileSyncModifyMessage mtime */
                mtime?: (number|Long|null);

                /** FileSyncModifyMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncModifyMessage. */
            type $Shape = proto.v1.FileSyncModifyMessage.$Properties;
        }

        /**
         * Properties of a FileSyncDeleteMessage.
         * @deprecated Use proto.v1.FileSyncDeleteMessage.$Properties instead.
         */
        type IFileSyncDeleteMessage = proto.v1.FileSyncDeleteMessage.$Properties;

        /** Represents a FileSyncDeleteMessage. */
        class FileSyncDeleteMessage {

            /**
             * Constructs a new FileSyncDeleteMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncDeleteMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncDeleteMessage path. */
            path: string;

            /** FileSyncDeleteMessage pathHash. */
            pathHash: string;

            /** FileSyncDeleteMessage ctime. */
            ctime: (number|Long);

            /** FileSyncDeleteMessage mtime. */
            mtime: (number|Long);

            /** FileSyncDeleteMessage size. */
            size: (number|Long);

            /** FileSyncDeleteMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new FileSyncDeleteMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncDeleteMessage instance
             */
            static create(properties: proto.v1.FileSyncDeleteMessage.$Shape): proto.v1.FileSyncDeleteMessage & proto.v1.FileSyncDeleteMessage.$Shape;
            static create(properties?: proto.v1.FileSyncDeleteMessage.$Properties): proto.v1.FileSyncDeleteMessage;

            /**
             * Encodes the specified FileSyncDeleteMessage message. Does not implicitly {@link proto.v1.FileSyncDeleteMessage.verify|verify} messages.
             * @param message FileSyncDeleteMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncDeleteMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncDeleteMessage message, length delimited. Does not implicitly {@link proto.v1.FileSyncDeleteMessage.verify|verify} messages.
             * @param message FileSyncDeleteMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncDeleteMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncDeleteMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncDeleteMessage & proto.v1.FileSyncDeleteMessage.$Shape} FileSyncDeleteMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncDeleteMessage & proto.v1.FileSyncDeleteMessage.$Shape;

            /**
             * Decodes a FileSyncDeleteMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncDeleteMessage & proto.v1.FileSyncDeleteMessage.$Shape} FileSyncDeleteMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncDeleteMessage & proto.v1.FileSyncDeleteMessage.$Shape;

            /**
             * Verifies a FileSyncDeleteMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncDeleteMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncDeleteMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncDeleteMessage;

            /**
             * Creates a plain object from a FileSyncDeleteMessage message. Also converts values to other types if specified.
             * @param message FileSyncDeleteMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncDeleteMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncDeleteMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncDeleteMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncDeleteMessage {

            /** Properties of a FileSyncDeleteMessage. */
            interface $Properties {

                /** FileSyncDeleteMessage path */
                path?: (string|null);

                /** FileSyncDeleteMessage pathHash */
                pathHash?: (string|null);

                /** FileSyncDeleteMessage ctime */
                ctime?: (number|Long|null);

                /** FileSyncDeleteMessage mtime */
                mtime?: (number|Long|null);

                /** FileSyncDeleteMessage size */
                size?: (number|Long|null);

                /** FileSyncDeleteMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncDeleteMessage. */
            type $Shape = proto.v1.FileSyncDeleteMessage.$Properties;
        }

        /**
         * Properties of a FileSyncRenameMessage.
         * @deprecated Use proto.v1.FileSyncRenameMessage.$Properties instead.
         */
        type IFileSyncRenameMessage = proto.v1.FileSyncRenameMessage.$Properties;

        /** Represents a FileSyncRenameMessage. */
        class FileSyncRenameMessage {

            /**
             * Constructs a new FileSyncRenameMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncRenameMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncRenameMessage path. */
            path: string;

            /** FileSyncRenameMessage pathHash. */
            pathHash: string;

            /** FileSyncRenameMessage contentHash. */
            contentHash: string;

            /** FileSyncRenameMessage ctime. */
            ctime: (number|Long);

            /** FileSyncRenameMessage mtime. */
            mtime: (number|Long);

            /** FileSyncRenameMessage size. */
            size: (number|Long);

            /** FileSyncRenameMessage lastTime. */
            lastTime: (number|Long);

            /** FileSyncRenameMessage oldPath. */
            oldPath: string;

            /** FileSyncRenameMessage oldPathHash. */
            oldPathHash: string;

            /**
             * Creates a new FileSyncRenameMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncRenameMessage instance
             */
            static create(properties: proto.v1.FileSyncRenameMessage.$Shape): proto.v1.FileSyncRenameMessage & proto.v1.FileSyncRenameMessage.$Shape;
            static create(properties?: proto.v1.FileSyncRenameMessage.$Properties): proto.v1.FileSyncRenameMessage;

            /**
             * Encodes the specified FileSyncRenameMessage message. Does not implicitly {@link proto.v1.FileSyncRenameMessage.verify|verify} messages.
             * @param message FileSyncRenameMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncRenameMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncRenameMessage message, length delimited. Does not implicitly {@link proto.v1.FileSyncRenameMessage.verify|verify} messages.
             * @param message FileSyncRenameMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncRenameMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncRenameMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncRenameMessage & proto.v1.FileSyncRenameMessage.$Shape} FileSyncRenameMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncRenameMessage & proto.v1.FileSyncRenameMessage.$Shape;

            /**
             * Decodes a FileSyncRenameMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncRenameMessage & proto.v1.FileSyncRenameMessage.$Shape} FileSyncRenameMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncRenameMessage & proto.v1.FileSyncRenameMessage.$Shape;

            /**
             * Verifies a FileSyncRenameMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncRenameMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncRenameMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncRenameMessage;

            /**
             * Creates a plain object from a FileSyncRenameMessage message. Also converts values to other types if specified.
             * @param message FileSyncRenameMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncRenameMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncRenameMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncRenameMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncRenameMessage {

            /** Properties of a FileSyncRenameMessage. */
            interface $Properties {

                /** FileSyncRenameMessage path */
                path?: (string|null);

                /** FileSyncRenameMessage pathHash */
                pathHash?: (string|null);

                /** FileSyncRenameMessage contentHash */
                contentHash?: (string|null);

                /** FileSyncRenameMessage ctime */
                ctime?: (number|Long|null);

                /** FileSyncRenameMessage mtime */
                mtime?: (number|Long|null);

                /** FileSyncRenameMessage size */
                size?: (number|Long|null);

                /** FileSyncRenameMessage lastTime */
                lastTime?: (number|Long|null);

                /** FileSyncRenameMessage oldPath */
                oldPath?: (string|null);

                /** FileSyncRenameMessage oldPathHash */
                oldPathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncRenameMessage. */
            type $Shape = proto.v1.FileSyncRenameMessage.$Properties;
        }

        /**
         * Properties of a FileSyncMtimeMessage.
         * @deprecated Use proto.v1.FileSyncMtimeMessage.$Properties instead.
         */
        type IFileSyncMtimeMessage = proto.v1.FileSyncMtimeMessage.$Properties;

        /** Represents a FileSyncMtimeMessage. */
        class FileSyncMtimeMessage {

            /**
             * Constructs a new FileSyncMtimeMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncMtimeMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncMtimeMessage path. */
            path: string;

            /** FileSyncMtimeMessage ctime. */
            ctime: (number|Long);

            /** FileSyncMtimeMessage mtime. */
            mtime: (number|Long);

            /** FileSyncMtimeMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new FileSyncMtimeMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncMtimeMessage instance
             */
            static create(properties: proto.v1.FileSyncMtimeMessage.$Shape): proto.v1.FileSyncMtimeMessage & proto.v1.FileSyncMtimeMessage.$Shape;
            static create(properties?: proto.v1.FileSyncMtimeMessage.$Properties): proto.v1.FileSyncMtimeMessage;

            /**
             * Encodes the specified FileSyncMtimeMessage message. Does not implicitly {@link proto.v1.FileSyncMtimeMessage.verify|verify} messages.
             * @param message FileSyncMtimeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncMtimeMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncMtimeMessage message, length delimited. Does not implicitly {@link proto.v1.FileSyncMtimeMessage.verify|verify} messages.
             * @param message FileSyncMtimeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncMtimeMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncMtimeMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncMtimeMessage & proto.v1.FileSyncMtimeMessage.$Shape} FileSyncMtimeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncMtimeMessage & proto.v1.FileSyncMtimeMessage.$Shape;

            /**
             * Decodes a FileSyncMtimeMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncMtimeMessage & proto.v1.FileSyncMtimeMessage.$Shape} FileSyncMtimeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncMtimeMessage & proto.v1.FileSyncMtimeMessage.$Shape;

            /**
             * Verifies a FileSyncMtimeMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncMtimeMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncMtimeMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncMtimeMessage;

            /**
             * Creates a plain object from a FileSyncMtimeMessage message. Also converts values to other types if specified.
             * @param message FileSyncMtimeMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncMtimeMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncMtimeMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncMtimeMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncMtimeMessage {

            /** Properties of a FileSyncMtimeMessage. */
            interface $Properties {

                /** FileSyncMtimeMessage path */
                path?: (string|null);

                /** FileSyncMtimeMessage ctime */
                ctime?: (number|Long|null);

                /** FileSyncMtimeMessage mtime */
                mtime?: (number|Long|null);

                /** FileSyncMtimeMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncMtimeMessage. */
            type $Shape = proto.v1.FileSyncMtimeMessage.$Properties;
        }

        /**
         * Properties of a FileSyncEndMessage.
         * @deprecated Use proto.v1.FileSyncEndMessage.$Properties instead.
         */
        type IFileSyncEndMessage = proto.v1.FileSyncEndMessage.$Properties;

        /** Represents a FileSyncEndMessage. */
        class FileSyncEndMessage {

            /**
             * Constructs a new FileSyncEndMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncEndMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncEndMessage lastTime. */
            lastTime: (number|Long);

            /** FileSyncEndMessage needUploadCount. */
            needUploadCount: (number|Long);

            /** FileSyncEndMessage needModifyCount. */
            needModifyCount: (number|Long);

            /** FileSyncEndMessage needSyncMtimeCount. */
            needSyncMtimeCount: (number|Long);

            /** FileSyncEndMessage needDeleteCount. */
            needDeleteCount: (number|Long);

            /**
             * Creates a new FileSyncEndMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncEndMessage instance
             */
            static create(properties: proto.v1.FileSyncEndMessage.$Shape): proto.v1.FileSyncEndMessage & proto.v1.FileSyncEndMessage.$Shape;
            static create(properties?: proto.v1.FileSyncEndMessage.$Properties): proto.v1.FileSyncEndMessage;

            /**
             * Encodes the specified FileSyncEndMessage message. Does not implicitly {@link proto.v1.FileSyncEndMessage.verify|verify} messages.
             * @param message FileSyncEndMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncEndMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncEndMessage message, length delimited. Does not implicitly {@link proto.v1.FileSyncEndMessage.verify|verify} messages.
             * @param message FileSyncEndMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncEndMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncEndMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncEndMessage & proto.v1.FileSyncEndMessage.$Shape} FileSyncEndMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncEndMessage & proto.v1.FileSyncEndMessage.$Shape;

            /**
             * Decodes a FileSyncEndMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncEndMessage & proto.v1.FileSyncEndMessage.$Shape} FileSyncEndMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncEndMessage & proto.v1.FileSyncEndMessage.$Shape;

            /**
             * Verifies a FileSyncEndMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncEndMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncEndMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncEndMessage;

            /**
             * Creates a plain object from a FileSyncEndMessage message. Also converts values to other types if specified.
             * @param message FileSyncEndMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncEndMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncEndMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncEndMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncEndMessage {

            /** Properties of a FileSyncEndMessage. */
            interface $Properties {

                /** FileSyncEndMessage lastTime */
                lastTime?: (number|Long|null);

                /** FileSyncEndMessage needUploadCount */
                needUploadCount?: (number|Long|null);

                /** FileSyncEndMessage needModifyCount */
                needModifyCount?: (number|Long|null);

                /** FileSyncEndMessage needSyncMtimeCount */
                needSyncMtimeCount?: (number|Long|null);

                /** FileSyncEndMessage needDeleteCount */
                needDeleteCount?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncEndMessage. */
            type $Shape = proto.v1.FileSyncEndMessage.$Properties;
        }

        /**
         * Properties of a FileSyncUploadMessage.
         * @deprecated Use proto.v1.FileSyncUploadMessage.$Properties instead.
         */
        type IFileSyncUploadMessage = proto.v1.FileSyncUploadMessage.$Properties;

        /** Represents a FileSyncUploadMessage. */
        class FileSyncUploadMessage {

            /**
             * Constructs a new FileSyncUploadMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncUploadMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncUploadMessage path. */
            path: string;

            /** FileSyncUploadMessage pathHash. */
            pathHash: string;

            /** FileSyncUploadMessage sessionId. */
            sessionId: string;

            /** FileSyncUploadMessage chunkSize. */
            chunkSize: (number|Long);

            /**
             * Creates a new FileSyncUploadMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncUploadMessage instance
             */
            static create(properties: proto.v1.FileSyncUploadMessage.$Shape): proto.v1.FileSyncUploadMessage & proto.v1.FileSyncUploadMessage.$Shape;
            static create(properties?: proto.v1.FileSyncUploadMessage.$Properties): proto.v1.FileSyncUploadMessage;

            /**
             * Encodes the specified FileSyncUploadMessage message. Does not implicitly {@link proto.v1.FileSyncUploadMessage.verify|verify} messages.
             * @param message FileSyncUploadMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncUploadMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncUploadMessage message, length delimited. Does not implicitly {@link proto.v1.FileSyncUploadMessage.verify|verify} messages.
             * @param message FileSyncUploadMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncUploadMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncUploadMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncUploadMessage & proto.v1.FileSyncUploadMessage.$Shape} FileSyncUploadMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncUploadMessage & proto.v1.FileSyncUploadMessage.$Shape;

            /**
             * Decodes a FileSyncUploadMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncUploadMessage & proto.v1.FileSyncUploadMessage.$Shape} FileSyncUploadMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncUploadMessage & proto.v1.FileSyncUploadMessage.$Shape;

            /**
             * Verifies a FileSyncUploadMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncUploadMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncUploadMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncUploadMessage;

            /**
             * Creates a plain object from a FileSyncUploadMessage message. Also converts values to other types if specified.
             * @param message FileSyncUploadMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncUploadMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncUploadMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncUploadMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncUploadMessage {

            /** Properties of a FileSyncUploadMessage. */
            interface $Properties {

                /** FileSyncUploadMessage path */
                path?: (string|null);

                /** FileSyncUploadMessage pathHash */
                pathHash?: (string|null);

                /** FileSyncUploadMessage sessionId */
                sessionId?: (string|null);

                /** FileSyncUploadMessage chunkSize */
                chunkSize?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncUploadMessage. */
            type $Shape = proto.v1.FileSyncUploadMessage.$Properties;
        }

        /**
         * Properties of a FileSyncDownloadMessage.
         * @deprecated Use proto.v1.FileSyncDownloadMessage.$Properties instead.
         */
        type IFileSyncDownloadMessage = proto.v1.FileSyncDownloadMessage.$Properties;

        /** Represents a FileSyncDownloadMessage. */
        class FileSyncDownloadMessage {

            /**
             * Constructs a new FileSyncDownloadMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncDownloadMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncDownloadMessage path. */
            path: string;

            /** FileSyncDownloadMessage contentHash. */
            contentHash: string;

            /** FileSyncDownloadMessage ctime. */
            ctime: (number|Long);

            /** FileSyncDownloadMessage mtime. */
            mtime: (number|Long);

            /** FileSyncDownloadMessage sessionId. */
            sessionId: string;

            /** FileSyncDownloadMessage chunkSize. */
            chunkSize: (number|Long);

            /** FileSyncDownloadMessage totalChunks. */
            totalChunks: (number|Long);

            /** FileSyncDownloadMessage size. */
            size: (number|Long);

            /**
             * Creates a new FileSyncDownloadMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncDownloadMessage instance
             */
            static create(properties: proto.v1.FileSyncDownloadMessage.$Shape): proto.v1.FileSyncDownloadMessage & proto.v1.FileSyncDownloadMessage.$Shape;
            static create(properties?: proto.v1.FileSyncDownloadMessage.$Properties): proto.v1.FileSyncDownloadMessage;

            /**
             * Encodes the specified FileSyncDownloadMessage message. Does not implicitly {@link proto.v1.FileSyncDownloadMessage.verify|verify} messages.
             * @param message FileSyncDownloadMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncDownloadMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncDownloadMessage message, length delimited. Does not implicitly {@link proto.v1.FileSyncDownloadMessage.verify|verify} messages.
             * @param message FileSyncDownloadMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncDownloadMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncDownloadMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncDownloadMessage & proto.v1.FileSyncDownloadMessage.$Shape} FileSyncDownloadMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncDownloadMessage & proto.v1.FileSyncDownloadMessage.$Shape;

            /**
             * Decodes a FileSyncDownloadMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncDownloadMessage & proto.v1.FileSyncDownloadMessage.$Shape} FileSyncDownloadMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncDownloadMessage & proto.v1.FileSyncDownloadMessage.$Shape;

            /**
             * Verifies a FileSyncDownloadMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncDownloadMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncDownloadMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncDownloadMessage;

            /**
             * Creates a plain object from a FileSyncDownloadMessage message. Also converts values to other types if specified.
             * @param message FileSyncDownloadMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncDownloadMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncDownloadMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncDownloadMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncDownloadMessage {

            /** Properties of a FileSyncDownloadMessage. */
            interface $Properties {

                /** FileSyncDownloadMessage path */
                path?: (string|null);

                /** FileSyncDownloadMessage contentHash */
                contentHash?: (string|null);

                /** FileSyncDownloadMessage ctime */
                ctime?: (number|Long|null);

                /** FileSyncDownloadMessage mtime */
                mtime?: (number|Long|null);

                /** FileSyncDownloadMessage sessionId */
                sessionId?: (string|null);

                /** FileSyncDownloadMessage chunkSize */
                chunkSize?: (number|Long|null);

                /** FileSyncDownloadMessage totalChunks */
                totalChunks?: (number|Long|null);

                /** FileSyncDownloadMessage size */
                size?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncDownloadMessage. */
            type $Shape = proto.v1.FileSyncDownloadMessage.$Properties;
        }

        /**
         * Properties of a FileRenameAckMessage.
         * @deprecated Use proto.v1.FileRenameAckMessage.$Properties instead.
         */
        type IFileRenameAckMessage = proto.v1.FileRenameAckMessage.$Properties;

        /** Represents a FileRenameAckMessage. */
        class FileRenameAckMessage {

            /**
             * Constructs a new FileRenameAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileRenameAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileRenameAckMessage lastTime. */
            lastTime: (number|Long);

            /** FileRenameAckMessage path. */
            path: string;

            /** FileRenameAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new FileRenameAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileRenameAckMessage instance
             */
            static create(properties: proto.v1.FileRenameAckMessage.$Shape): proto.v1.FileRenameAckMessage & proto.v1.FileRenameAckMessage.$Shape;
            static create(properties?: proto.v1.FileRenameAckMessage.$Properties): proto.v1.FileRenameAckMessage;

            /**
             * Encodes the specified FileRenameAckMessage message. Does not implicitly {@link proto.v1.FileRenameAckMessage.verify|verify} messages.
             * @param message FileRenameAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileRenameAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileRenameAckMessage message, length delimited. Does not implicitly {@link proto.v1.FileRenameAckMessage.verify|verify} messages.
             * @param message FileRenameAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileRenameAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileRenameAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileRenameAckMessage & proto.v1.FileRenameAckMessage.$Shape} FileRenameAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileRenameAckMessage & proto.v1.FileRenameAckMessage.$Shape;

            /**
             * Decodes a FileRenameAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileRenameAckMessage & proto.v1.FileRenameAckMessage.$Shape} FileRenameAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileRenameAckMessage & proto.v1.FileRenameAckMessage.$Shape;

            /**
             * Verifies a FileRenameAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileRenameAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileRenameAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileRenameAckMessage;

            /**
             * Creates a plain object from a FileRenameAckMessage message. Also converts values to other types if specified.
             * @param message FileRenameAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileRenameAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileRenameAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileRenameAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileRenameAckMessage {

            /** Properties of a FileRenameAckMessage. */
            interface $Properties {

                /** FileRenameAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** FileRenameAckMessage path */
                path?: (string|null);

                /** FileRenameAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileRenameAckMessage. */
            type $Shape = proto.v1.FileRenameAckMessage.$Properties;
        }

        /**
         * Properties of a FileUploadAckMessage.
         * @deprecated Use proto.v1.FileUploadAckMessage.$Properties instead.
         */
        type IFileUploadAckMessage = proto.v1.FileUploadAckMessage.$Properties;

        /** Represents a FileUploadAckMessage. */
        class FileUploadAckMessage {

            /**
             * Constructs a new FileUploadAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileUploadAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileUploadAckMessage lastTime. */
            lastTime: (number|Long);

            /** FileUploadAckMessage path. */
            path: string;

            /** FileUploadAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new FileUploadAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileUploadAckMessage instance
             */
            static create(properties: proto.v1.FileUploadAckMessage.$Shape): proto.v1.FileUploadAckMessage & proto.v1.FileUploadAckMessage.$Shape;
            static create(properties?: proto.v1.FileUploadAckMessage.$Properties): proto.v1.FileUploadAckMessage;

            /**
             * Encodes the specified FileUploadAckMessage message. Does not implicitly {@link proto.v1.FileUploadAckMessage.verify|verify} messages.
             * @param message FileUploadAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileUploadAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileUploadAckMessage message, length delimited. Does not implicitly {@link proto.v1.FileUploadAckMessage.verify|verify} messages.
             * @param message FileUploadAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileUploadAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileUploadAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileUploadAckMessage & proto.v1.FileUploadAckMessage.$Shape} FileUploadAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileUploadAckMessage & proto.v1.FileUploadAckMessage.$Shape;

            /**
             * Decodes a FileUploadAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileUploadAckMessage & proto.v1.FileUploadAckMessage.$Shape} FileUploadAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileUploadAckMessage & proto.v1.FileUploadAckMessage.$Shape;

            /**
             * Verifies a FileUploadAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileUploadAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileUploadAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileUploadAckMessage;

            /**
             * Creates a plain object from a FileUploadAckMessage message. Also converts values to other types if specified.
             * @param message FileUploadAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileUploadAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileUploadAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileUploadAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileUploadAckMessage {

            /** Properties of a FileUploadAckMessage. */
            interface $Properties {

                /** FileUploadAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** FileUploadAckMessage path */
                path?: (string|null);

                /** FileUploadAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileUploadAckMessage. */
            type $Shape = proto.v1.FileUploadAckMessage.$Properties;
        }

        /**
         * Properties of a FileDeleteAckMessage.
         * @deprecated Use proto.v1.FileDeleteAckMessage.$Properties instead.
         */
        type IFileDeleteAckMessage = proto.v1.FileDeleteAckMessage.$Properties;

        /** Represents a FileDeleteAckMessage. */
        class FileDeleteAckMessage {

            /**
             * Constructs a new FileDeleteAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileDeleteAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileDeleteAckMessage lastTime. */
            lastTime: (number|Long);

            /** FileDeleteAckMessage path. */
            path: string;

            /** FileDeleteAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new FileDeleteAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileDeleteAckMessage instance
             */
            static create(properties: proto.v1.FileDeleteAckMessage.$Shape): proto.v1.FileDeleteAckMessage & proto.v1.FileDeleteAckMessage.$Shape;
            static create(properties?: proto.v1.FileDeleteAckMessage.$Properties): proto.v1.FileDeleteAckMessage;

            /**
             * Encodes the specified FileDeleteAckMessage message. Does not implicitly {@link proto.v1.FileDeleteAckMessage.verify|verify} messages.
             * @param message FileDeleteAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileDeleteAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileDeleteAckMessage message, length delimited. Does not implicitly {@link proto.v1.FileDeleteAckMessage.verify|verify} messages.
             * @param message FileDeleteAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileDeleteAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileDeleteAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileDeleteAckMessage & proto.v1.FileDeleteAckMessage.$Shape} FileDeleteAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileDeleteAckMessage & proto.v1.FileDeleteAckMessage.$Shape;

            /**
             * Decodes a FileDeleteAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileDeleteAckMessage & proto.v1.FileDeleteAckMessage.$Shape} FileDeleteAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileDeleteAckMessage & proto.v1.FileDeleteAckMessage.$Shape;

            /**
             * Verifies a FileDeleteAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileDeleteAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileDeleteAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileDeleteAckMessage;

            /**
             * Creates a plain object from a FileDeleteAckMessage message. Also converts values to other types if specified.
             * @param message FileDeleteAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileDeleteAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileDeleteAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileDeleteAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileDeleteAckMessage {

            /** Properties of a FileDeleteAckMessage. */
            interface $Properties {

                /** FileDeleteAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** FileDeleteAckMessage path */
                path?: (string|null);

                /** FileDeleteAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileDeleteAckMessage. */
            type $Shape = proto.v1.FileDeleteAckMessage.$Properties;
        }

        /**
         * Properties of a SettingSyncRequest.
         * @deprecated Use proto.v1.SettingSyncRequest.$Properties instead.
         */
        type ISettingSyncRequest = proto.v1.SettingSyncRequest.$Properties;

        /** Represents a SettingSyncRequest. */
        class SettingSyncRequest {

            /**
             * Constructs a new SettingSyncRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncRequest context. */
            context: string;

            /** SettingSyncRequest vault. */
            vault: string;

            /** SettingSyncRequest lastTime. */
            lastTime: (number|Long);

            /** SettingSyncRequest settings. */
            settings: proto.v1.SettingSyncCheckRequest.$Properties[];

            /** SettingSyncRequest delSettings. */
            delSettings: proto.v1.SettingSyncDelSetting.$Properties[];

            /** SettingSyncRequest missingSettings. */
            missingSettings: proto.v1.SettingSyncDelSetting.$Properties[];

            /** SettingSyncRequest batchIndex. */
            batchIndex: number;

            /** SettingSyncRequest totalBatches. */
            totalBatches: number;

            /**
             * Creates a new SettingSyncRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncRequest instance
             */
            static create(properties: proto.v1.SettingSyncRequest.$Shape): proto.v1.SettingSyncRequest & proto.v1.SettingSyncRequest.$Shape;
            static create(properties?: proto.v1.SettingSyncRequest.$Properties): proto.v1.SettingSyncRequest;

            /**
             * Encodes the specified SettingSyncRequest message. Does not implicitly {@link proto.v1.SettingSyncRequest.verify|verify} messages.
             * @param message SettingSyncRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncRequest message, length delimited. Does not implicitly {@link proto.v1.SettingSyncRequest.verify|verify} messages.
             * @param message SettingSyncRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncRequest & proto.v1.SettingSyncRequest.$Shape} SettingSyncRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncRequest & proto.v1.SettingSyncRequest.$Shape;

            /**
             * Decodes a SettingSyncRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncRequest & proto.v1.SettingSyncRequest.$Shape} SettingSyncRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncRequest & proto.v1.SettingSyncRequest.$Shape;

            /**
             * Verifies a SettingSyncRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncRequest;

            /**
             * Creates a plain object from a SettingSyncRequest message. Also converts values to other types if specified.
             * @param message SettingSyncRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncRequest {

            /** Properties of a SettingSyncRequest. */
            interface $Properties {

                /** SettingSyncRequest context */
                context?: (string|null);

                /** SettingSyncRequest vault */
                vault?: (string|null);

                /** SettingSyncRequest lastTime */
                lastTime?: (number|Long|null);

                /** SettingSyncRequest settings */
                settings?: (proto.v1.SettingSyncCheckRequest.$Properties[]|null);

                /** SettingSyncRequest delSettings */
                delSettings?: (proto.v1.SettingSyncDelSetting.$Properties[]|null);

                /** SettingSyncRequest missingSettings */
                missingSettings?: (proto.v1.SettingSyncDelSetting.$Properties[]|null);

                /** SettingSyncRequest batchIndex */
                batchIndex?: (number|null);

                /** SettingSyncRequest totalBatches */
                totalBatches?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncRequest. */
            type $Shape = proto.v1.SettingSyncRequest.$Properties;
        }

        /**
         * Properties of a SettingSyncCheckRequest.
         * @deprecated Use proto.v1.SettingSyncCheckRequest.$Properties instead.
         */
        type ISettingSyncCheckRequest = proto.v1.SettingSyncCheckRequest.$Properties;

        /** Represents a SettingSyncCheckRequest. */
        class SettingSyncCheckRequest {

            /**
             * Constructs a new SettingSyncCheckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncCheckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncCheckRequest path. */
            path: string;

            /** SettingSyncCheckRequest pathHash. */
            pathHash: string;

            /** SettingSyncCheckRequest contentHash. */
            contentHash: string;

            /** SettingSyncCheckRequest mtime. */
            mtime: (number|Long);

            /** SettingSyncCheckRequest ctime. */
            ctime: (number|Long);

            /**
             * Creates a new SettingSyncCheckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncCheckRequest instance
             */
            static create(properties: proto.v1.SettingSyncCheckRequest.$Shape): proto.v1.SettingSyncCheckRequest & proto.v1.SettingSyncCheckRequest.$Shape;
            static create(properties?: proto.v1.SettingSyncCheckRequest.$Properties): proto.v1.SettingSyncCheckRequest;

            /**
             * Encodes the specified SettingSyncCheckRequest message. Does not implicitly {@link proto.v1.SettingSyncCheckRequest.verify|verify} messages.
             * @param message SettingSyncCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncCheckRequest message, length delimited. Does not implicitly {@link proto.v1.SettingSyncCheckRequest.verify|verify} messages.
             * @param message SettingSyncCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncCheckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncCheckRequest & proto.v1.SettingSyncCheckRequest.$Shape} SettingSyncCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncCheckRequest & proto.v1.SettingSyncCheckRequest.$Shape;

            /**
             * Decodes a SettingSyncCheckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncCheckRequest & proto.v1.SettingSyncCheckRequest.$Shape} SettingSyncCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncCheckRequest & proto.v1.SettingSyncCheckRequest.$Shape;

            /**
             * Verifies a SettingSyncCheckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncCheckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncCheckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncCheckRequest;

            /**
             * Creates a plain object from a SettingSyncCheckRequest message. Also converts values to other types if specified.
             * @param message SettingSyncCheckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncCheckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncCheckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncCheckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncCheckRequest {

            /** Properties of a SettingSyncCheckRequest. */
            interface $Properties {

                /** SettingSyncCheckRequest path */
                path?: (string|null);

                /** SettingSyncCheckRequest pathHash */
                pathHash?: (string|null);

                /** SettingSyncCheckRequest contentHash */
                contentHash?: (string|null);

                /** SettingSyncCheckRequest mtime */
                mtime?: (number|Long|null);

                /** SettingSyncCheckRequest ctime */
                ctime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncCheckRequest. */
            type $Shape = proto.v1.SettingSyncCheckRequest.$Properties;
        }

        /**
         * Properties of a SettingSyncDelSetting.
         * @deprecated Use proto.v1.SettingSyncDelSetting.$Properties instead.
         */
        type ISettingSyncDelSetting = proto.v1.SettingSyncDelSetting.$Properties;

        /** Represents a SettingSyncDelSetting. */
        class SettingSyncDelSetting {

            /**
             * Constructs a new SettingSyncDelSetting.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncDelSetting.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncDelSetting path. */
            path: string;

            /** SettingSyncDelSetting pathHash. */
            pathHash: string;

            /**
             * Creates a new SettingSyncDelSetting instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncDelSetting instance
             */
            static create(properties: proto.v1.SettingSyncDelSetting.$Shape): proto.v1.SettingSyncDelSetting & proto.v1.SettingSyncDelSetting.$Shape;
            static create(properties?: proto.v1.SettingSyncDelSetting.$Properties): proto.v1.SettingSyncDelSetting;

            /**
             * Encodes the specified SettingSyncDelSetting message. Does not implicitly {@link proto.v1.SettingSyncDelSetting.verify|verify} messages.
             * @param message SettingSyncDelSetting message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncDelSetting.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncDelSetting message, length delimited. Does not implicitly {@link proto.v1.SettingSyncDelSetting.verify|verify} messages.
             * @param message SettingSyncDelSetting message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncDelSetting.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncDelSetting message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncDelSetting & proto.v1.SettingSyncDelSetting.$Shape} SettingSyncDelSetting
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncDelSetting & proto.v1.SettingSyncDelSetting.$Shape;

            /**
             * Decodes a SettingSyncDelSetting message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncDelSetting & proto.v1.SettingSyncDelSetting.$Shape} SettingSyncDelSetting
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncDelSetting & proto.v1.SettingSyncDelSetting.$Shape;

            /**
             * Verifies a SettingSyncDelSetting message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncDelSetting message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncDelSetting
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncDelSetting;

            /**
             * Creates a plain object from a SettingSyncDelSetting message. Also converts values to other types if specified.
             * @param message SettingSyncDelSetting
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncDelSetting, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncDelSetting to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncDelSetting
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncDelSetting {

            /** Properties of a SettingSyncDelSetting. */
            interface $Properties {

                /** SettingSyncDelSetting path */
                path?: (string|null);

                /** SettingSyncDelSetting pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncDelSetting. */
            type $Shape = proto.v1.SettingSyncDelSetting.$Properties;
        }

        /**
         * Properties of a SettingModifyOrCreateRequest.
         * @deprecated Use proto.v1.SettingModifyOrCreateRequest.$Properties instead.
         */
        type ISettingModifyOrCreateRequest = proto.v1.SettingModifyOrCreateRequest.$Properties;

        /** Represents a SettingModifyOrCreateRequest. */
        class SettingModifyOrCreateRequest {

            /**
             * Constructs a new SettingModifyOrCreateRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingModifyOrCreateRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingModifyOrCreateRequest vault. */
            vault: string;

            /** SettingModifyOrCreateRequest path. */
            path: string;

            /** SettingModifyOrCreateRequest pathHash. */
            pathHash: string;

            /** SettingModifyOrCreateRequest content. */
            content: string;

            /** SettingModifyOrCreateRequest contentHash. */
            contentHash: string;

            /** SettingModifyOrCreateRequest ctime. */
            ctime: (number|Long);

            /** SettingModifyOrCreateRequest mtime. */
            mtime: (number|Long);

            /** SettingModifyOrCreateRequest context. */
            context: string;

            /**
             * Creates a new SettingModifyOrCreateRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingModifyOrCreateRequest instance
             */
            static create(properties: proto.v1.SettingModifyOrCreateRequest.$Shape): proto.v1.SettingModifyOrCreateRequest & proto.v1.SettingModifyOrCreateRequest.$Shape;
            static create(properties?: proto.v1.SettingModifyOrCreateRequest.$Properties): proto.v1.SettingModifyOrCreateRequest;

            /**
             * Encodes the specified SettingModifyOrCreateRequest message. Does not implicitly {@link proto.v1.SettingModifyOrCreateRequest.verify|verify} messages.
             * @param message SettingModifyOrCreateRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingModifyOrCreateRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingModifyOrCreateRequest message, length delimited. Does not implicitly {@link proto.v1.SettingModifyOrCreateRequest.verify|verify} messages.
             * @param message SettingModifyOrCreateRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingModifyOrCreateRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingModifyOrCreateRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingModifyOrCreateRequest & proto.v1.SettingModifyOrCreateRequest.$Shape} SettingModifyOrCreateRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingModifyOrCreateRequest & proto.v1.SettingModifyOrCreateRequest.$Shape;

            /**
             * Decodes a SettingModifyOrCreateRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingModifyOrCreateRequest & proto.v1.SettingModifyOrCreateRequest.$Shape} SettingModifyOrCreateRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingModifyOrCreateRequest & proto.v1.SettingModifyOrCreateRequest.$Shape;

            /**
             * Verifies a SettingModifyOrCreateRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingModifyOrCreateRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingModifyOrCreateRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingModifyOrCreateRequest;

            /**
             * Creates a plain object from a SettingModifyOrCreateRequest message. Also converts values to other types if specified.
             * @param message SettingModifyOrCreateRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingModifyOrCreateRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingModifyOrCreateRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingModifyOrCreateRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingModifyOrCreateRequest {

            /** Properties of a SettingModifyOrCreateRequest. */
            interface $Properties {

                /** SettingModifyOrCreateRequest vault */
                vault?: (string|null);

                /** SettingModifyOrCreateRequest path */
                path?: (string|null);

                /** SettingModifyOrCreateRequest pathHash */
                pathHash?: (string|null);

                /** SettingModifyOrCreateRequest content */
                content?: (string|null);

                /** SettingModifyOrCreateRequest contentHash */
                contentHash?: (string|null);

                /** SettingModifyOrCreateRequest ctime */
                ctime?: (number|Long|null);

                /** SettingModifyOrCreateRequest mtime */
                mtime?: (number|Long|null);

                /** SettingModifyOrCreateRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingModifyOrCreateRequest. */
            type $Shape = proto.v1.SettingModifyOrCreateRequest.$Properties;
        }

        /**
         * Properties of a SettingUpdateCheckRequest.
         * @deprecated Use proto.v1.SettingUpdateCheckRequest.$Properties instead.
         */
        type ISettingUpdateCheckRequest = proto.v1.SettingUpdateCheckRequest.$Properties;

        /** Represents a SettingUpdateCheckRequest. */
        class SettingUpdateCheckRequest {

            /**
             * Constructs a new SettingUpdateCheckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingUpdateCheckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingUpdateCheckRequest vault. */
            vault: string;

            /** SettingUpdateCheckRequest path. */
            path: string;

            /** SettingUpdateCheckRequest pathHash. */
            pathHash: string;

            /** SettingUpdateCheckRequest contentHash. */
            contentHash: string;

            /** SettingUpdateCheckRequest ctime. */
            ctime: (number|Long);

            /** SettingUpdateCheckRequest mtime. */
            mtime: (number|Long);

            /**
             * Creates a new SettingUpdateCheckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingUpdateCheckRequest instance
             */
            static create(properties: proto.v1.SettingUpdateCheckRequest.$Shape): proto.v1.SettingUpdateCheckRequest & proto.v1.SettingUpdateCheckRequest.$Shape;
            static create(properties?: proto.v1.SettingUpdateCheckRequest.$Properties): proto.v1.SettingUpdateCheckRequest;

            /**
             * Encodes the specified SettingUpdateCheckRequest message. Does not implicitly {@link proto.v1.SettingUpdateCheckRequest.verify|verify} messages.
             * @param message SettingUpdateCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingUpdateCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingUpdateCheckRequest message, length delimited. Does not implicitly {@link proto.v1.SettingUpdateCheckRequest.verify|verify} messages.
             * @param message SettingUpdateCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingUpdateCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingUpdateCheckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingUpdateCheckRequest & proto.v1.SettingUpdateCheckRequest.$Shape} SettingUpdateCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingUpdateCheckRequest & proto.v1.SettingUpdateCheckRequest.$Shape;

            /**
             * Decodes a SettingUpdateCheckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingUpdateCheckRequest & proto.v1.SettingUpdateCheckRequest.$Shape} SettingUpdateCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingUpdateCheckRequest & proto.v1.SettingUpdateCheckRequest.$Shape;

            /**
             * Verifies a SettingUpdateCheckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingUpdateCheckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingUpdateCheckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingUpdateCheckRequest;

            /**
             * Creates a plain object from a SettingUpdateCheckRequest message. Also converts values to other types if specified.
             * @param message SettingUpdateCheckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingUpdateCheckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingUpdateCheckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingUpdateCheckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingUpdateCheckRequest {

            /** Properties of a SettingUpdateCheckRequest. */
            interface $Properties {

                /** SettingUpdateCheckRequest vault */
                vault?: (string|null);

                /** SettingUpdateCheckRequest path */
                path?: (string|null);

                /** SettingUpdateCheckRequest pathHash */
                pathHash?: (string|null);

                /** SettingUpdateCheckRequest contentHash */
                contentHash?: (string|null);

                /** SettingUpdateCheckRequest ctime */
                ctime?: (number|Long|null);

                /** SettingUpdateCheckRequest mtime */
                mtime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingUpdateCheckRequest. */
            type $Shape = proto.v1.SettingUpdateCheckRequest.$Properties;
        }

        /**
         * Properties of a SettingDeleteRequest.
         * @deprecated Use proto.v1.SettingDeleteRequest.$Properties instead.
         */
        type ISettingDeleteRequest = proto.v1.SettingDeleteRequest.$Properties;

        /** Represents a SettingDeleteRequest. */
        class SettingDeleteRequest {

            /**
             * Constructs a new SettingDeleteRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingDeleteRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingDeleteRequest vault. */
            vault: string;

            /** SettingDeleteRequest path. */
            path: string;

            /** SettingDeleteRequest pathHash. */
            pathHash: string;

            /** SettingDeleteRequest context. */
            context: string;

            /**
             * Creates a new SettingDeleteRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingDeleteRequest instance
             */
            static create(properties: proto.v1.SettingDeleteRequest.$Shape): proto.v1.SettingDeleteRequest & proto.v1.SettingDeleteRequest.$Shape;
            static create(properties?: proto.v1.SettingDeleteRequest.$Properties): proto.v1.SettingDeleteRequest;

            /**
             * Encodes the specified SettingDeleteRequest message. Does not implicitly {@link proto.v1.SettingDeleteRequest.verify|verify} messages.
             * @param message SettingDeleteRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingDeleteRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingDeleteRequest message, length delimited. Does not implicitly {@link proto.v1.SettingDeleteRequest.verify|verify} messages.
             * @param message SettingDeleteRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingDeleteRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingDeleteRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingDeleteRequest & proto.v1.SettingDeleteRequest.$Shape} SettingDeleteRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingDeleteRequest & proto.v1.SettingDeleteRequest.$Shape;

            /**
             * Decodes a SettingDeleteRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingDeleteRequest & proto.v1.SettingDeleteRequest.$Shape} SettingDeleteRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingDeleteRequest & proto.v1.SettingDeleteRequest.$Shape;

            /**
             * Verifies a SettingDeleteRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingDeleteRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingDeleteRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingDeleteRequest;

            /**
             * Creates a plain object from a SettingDeleteRequest message. Also converts values to other types if specified.
             * @param message SettingDeleteRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingDeleteRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingDeleteRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingDeleteRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingDeleteRequest {

            /** Properties of a SettingDeleteRequest. */
            interface $Properties {

                /** SettingDeleteRequest vault */
                vault?: (string|null);

                /** SettingDeleteRequest path */
                path?: (string|null);

                /** SettingDeleteRequest pathHash */
                pathHash?: (string|null);

                /** SettingDeleteRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingDeleteRequest. */
            type $Shape = proto.v1.SettingDeleteRequest.$Properties;
        }

        /**
         * Properties of a SettingGetRequest.
         * @deprecated Use proto.v1.SettingGetRequest.$Properties instead.
         */
        type ISettingGetRequest = proto.v1.SettingGetRequest.$Properties;

        /** Represents a SettingGetRequest. */
        class SettingGetRequest {

            /**
             * Constructs a new SettingGetRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingGetRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingGetRequest vault. */
            vault: string;

            /** SettingGetRequest path. */
            path: string;

            /** SettingGetRequest pathHash. */
            pathHash: string;

            /**
             * Creates a new SettingGetRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingGetRequest instance
             */
            static create(properties: proto.v1.SettingGetRequest.$Shape): proto.v1.SettingGetRequest & proto.v1.SettingGetRequest.$Shape;
            static create(properties?: proto.v1.SettingGetRequest.$Properties): proto.v1.SettingGetRequest;

            /**
             * Encodes the specified SettingGetRequest message. Does not implicitly {@link proto.v1.SettingGetRequest.verify|verify} messages.
             * @param message SettingGetRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingGetRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingGetRequest message, length delimited. Does not implicitly {@link proto.v1.SettingGetRequest.verify|verify} messages.
             * @param message SettingGetRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingGetRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingGetRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingGetRequest & proto.v1.SettingGetRequest.$Shape} SettingGetRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingGetRequest & proto.v1.SettingGetRequest.$Shape;

            /**
             * Decodes a SettingGetRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingGetRequest & proto.v1.SettingGetRequest.$Shape} SettingGetRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingGetRequest & proto.v1.SettingGetRequest.$Shape;

            /**
             * Verifies a SettingGetRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingGetRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingGetRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingGetRequest;

            /**
             * Creates a plain object from a SettingGetRequest message. Also converts values to other types if specified.
             * @param message SettingGetRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingGetRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingGetRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingGetRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingGetRequest {

            /** Properties of a SettingGetRequest. */
            interface $Properties {

                /** SettingGetRequest vault */
                vault?: (string|null);

                /** SettingGetRequest path */
                path?: (string|null);

                /** SettingGetRequest pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingGetRequest. */
            type $Shape = proto.v1.SettingGetRequest.$Properties;
        }

        /**
         * Properties of a SettingClearRequest.
         * @deprecated Use proto.v1.SettingClearRequest.$Properties instead.
         */
        type ISettingClearRequest = proto.v1.SettingClearRequest.$Properties;

        /** Represents a SettingClearRequest. */
        class SettingClearRequest {

            /**
             * Constructs a new SettingClearRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingClearRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingClearRequest vault. */
            vault: string;

            /**
             * Creates a new SettingClearRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingClearRequest instance
             */
            static create(properties: proto.v1.SettingClearRequest.$Shape): proto.v1.SettingClearRequest & proto.v1.SettingClearRequest.$Shape;
            static create(properties?: proto.v1.SettingClearRequest.$Properties): proto.v1.SettingClearRequest;

            /**
             * Encodes the specified SettingClearRequest message. Does not implicitly {@link proto.v1.SettingClearRequest.verify|verify} messages.
             * @param message SettingClearRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingClearRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingClearRequest message, length delimited. Does not implicitly {@link proto.v1.SettingClearRequest.verify|verify} messages.
             * @param message SettingClearRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingClearRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingClearRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingClearRequest & proto.v1.SettingClearRequest.$Shape} SettingClearRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingClearRequest & proto.v1.SettingClearRequest.$Shape;

            /**
             * Decodes a SettingClearRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingClearRequest & proto.v1.SettingClearRequest.$Shape} SettingClearRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingClearRequest & proto.v1.SettingClearRequest.$Shape;

            /**
             * Verifies a SettingClearRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingClearRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingClearRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingClearRequest;

            /**
             * Creates a plain object from a SettingClearRequest message. Also converts values to other types if specified.
             * @param message SettingClearRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingClearRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingClearRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingClearRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingClearRequest {

            /** Properties of a SettingClearRequest. */
            interface $Properties {

                /** SettingClearRequest vault */
                vault?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingClearRequest. */
            type $Shape = proto.v1.SettingClearRequest.$Properties;
        }

        /**
         * Properties of a SettingSyncModifyMessage.
         * @deprecated Use proto.v1.SettingSyncModifyMessage.$Properties instead.
         */
        type ISettingSyncModifyMessage = proto.v1.SettingSyncModifyMessage.$Properties;

        /** Represents a SettingSyncModifyMessage. */
        class SettingSyncModifyMessage {

            /**
             * Constructs a new SettingSyncModifyMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncModifyMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncModifyMessage vault. */
            vault: string;

            /** SettingSyncModifyMessage path. */
            path: string;

            /** SettingSyncModifyMessage pathHash. */
            pathHash: string;

            /** SettingSyncModifyMessage content. */
            content: string;

            /** SettingSyncModifyMessage contentHash. */
            contentHash: string;

            /** SettingSyncModifyMessage ctime. */
            ctime: (number|Long);

            /** SettingSyncModifyMessage mtime. */
            mtime: (number|Long);

            /** SettingSyncModifyMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new SettingSyncModifyMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncModifyMessage instance
             */
            static create(properties: proto.v1.SettingSyncModifyMessage.$Shape): proto.v1.SettingSyncModifyMessage & proto.v1.SettingSyncModifyMessage.$Shape;
            static create(properties?: proto.v1.SettingSyncModifyMessage.$Properties): proto.v1.SettingSyncModifyMessage;

            /**
             * Encodes the specified SettingSyncModifyMessage message. Does not implicitly {@link proto.v1.SettingSyncModifyMessage.verify|verify} messages.
             * @param message SettingSyncModifyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncModifyMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncModifyMessage message, length delimited. Does not implicitly {@link proto.v1.SettingSyncModifyMessage.verify|verify} messages.
             * @param message SettingSyncModifyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncModifyMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncModifyMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncModifyMessage & proto.v1.SettingSyncModifyMessage.$Shape} SettingSyncModifyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncModifyMessage & proto.v1.SettingSyncModifyMessage.$Shape;

            /**
             * Decodes a SettingSyncModifyMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncModifyMessage & proto.v1.SettingSyncModifyMessage.$Shape} SettingSyncModifyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncModifyMessage & proto.v1.SettingSyncModifyMessage.$Shape;

            /**
             * Verifies a SettingSyncModifyMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncModifyMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncModifyMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncModifyMessage;

            /**
             * Creates a plain object from a SettingSyncModifyMessage message. Also converts values to other types if specified.
             * @param message SettingSyncModifyMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncModifyMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncModifyMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncModifyMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncModifyMessage {

            /** Properties of a SettingSyncModifyMessage. */
            interface $Properties {

                /** SettingSyncModifyMessage vault */
                vault?: (string|null);

                /** SettingSyncModifyMessage path */
                path?: (string|null);

                /** SettingSyncModifyMessage pathHash */
                pathHash?: (string|null);

                /** SettingSyncModifyMessage content */
                content?: (string|null);

                /** SettingSyncModifyMessage contentHash */
                contentHash?: (string|null);

                /** SettingSyncModifyMessage ctime */
                ctime?: (number|Long|null);

                /** SettingSyncModifyMessage mtime */
                mtime?: (number|Long|null);

                /** SettingSyncModifyMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncModifyMessage. */
            type $Shape = proto.v1.SettingSyncModifyMessage.$Properties;
        }

        /**
         * Properties of a SettingSyncDeleteMessage.
         * @deprecated Use proto.v1.SettingSyncDeleteMessage.$Properties instead.
         */
        type ISettingSyncDeleteMessage = proto.v1.SettingSyncDeleteMessage.$Properties;

        /** Represents a SettingSyncDeleteMessage. */
        class SettingSyncDeleteMessage {

            /**
             * Constructs a new SettingSyncDeleteMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncDeleteMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncDeleteMessage path. */
            path: string;

            /** SettingSyncDeleteMessage pathHash. */
            pathHash: string;

            /** SettingSyncDeleteMessage ctime. */
            ctime: (number|Long);

            /** SettingSyncDeleteMessage mtime. */
            mtime: (number|Long);

            /** SettingSyncDeleteMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new SettingSyncDeleteMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncDeleteMessage instance
             */
            static create(properties: proto.v1.SettingSyncDeleteMessage.$Shape): proto.v1.SettingSyncDeleteMessage & proto.v1.SettingSyncDeleteMessage.$Shape;
            static create(properties?: proto.v1.SettingSyncDeleteMessage.$Properties): proto.v1.SettingSyncDeleteMessage;

            /**
             * Encodes the specified SettingSyncDeleteMessage message. Does not implicitly {@link proto.v1.SettingSyncDeleteMessage.verify|verify} messages.
             * @param message SettingSyncDeleteMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncDeleteMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncDeleteMessage message, length delimited. Does not implicitly {@link proto.v1.SettingSyncDeleteMessage.verify|verify} messages.
             * @param message SettingSyncDeleteMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncDeleteMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncDeleteMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncDeleteMessage & proto.v1.SettingSyncDeleteMessage.$Shape} SettingSyncDeleteMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncDeleteMessage & proto.v1.SettingSyncDeleteMessage.$Shape;

            /**
             * Decodes a SettingSyncDeleteMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncDeleteMessage & proto.v1.SettingSyncDeleteMessage.$Shape} SettingSyncDeleteMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncDeleteMessage & proto.v1.SettingSyncDeleteMessage.$Shape;

            /**
             * Verifies a SettingSyncDeleteMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncDeleteMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncDeleteMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncDeleteMessage;

            /**
             * Creates a plain object from a SettingSyncDeleteMessage message. Also converts values to other types if specified.
             * @param message SettingSyncDeleteMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncDeleteMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncDeleteMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncDeleteMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncDeleteMessage {

            /** Properties of a SettingSyncDeleteMessage. */
            interface $Properties {

                /** SettingSyncDeleteMessage path */
                path?: (string|null);

                /** SettingSyncDeleteMessage pathHash */
                pathHash?: (string|null);

                /** SettingSyncDeleteMessage ctime */
                ctime?: (number|Long|null);

                /** SettingSyncDeleteMessage mtime */
                mtime?: (number|Long|null);

                /** SettingSyncDeleteMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncDeleteMessage. */
            type $Shape = proto.v1.SettingSyncDeleteMessage.$Properties;
        }

        /**
         * Properties of a SettingSyncMtimeMessage.
         * @deprecated Use proto.v1.SettingSyncMtimeMessage.$Properties instead.
         */
        type ISettingSyncMtimeMessage = proto.v1.SettingSyncMtimeMessage.$Properties;

        /** Represents a SettingSyncMtimeMessage. */
        class SettingSyncMtimeMessage {

            /**
             * Constructs a new SettingSyncMtimeMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncMtimeMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncMtimeMessage path. */
            path: string;

            /** SettingSyncMtimeMessage ctime. */
            ctime: (number|Long);

            /** SettingSyncMtimeMessage mtime. */
            mtime: (number|Long);

            /** SettingSyncMtimeMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new SettingSyncMtimeMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncMtimeMessage instance
             */
            static create(properties: proto.v1.SettingSyncMtimeMessage.$Shape): proto.v1.SettingSyncMtimeMessage & proto.v1.SettingSyncMtimeMessage.$Shape;
            static create(properties?: proto.v1.SettingSyncMtimeMessage.$Properties): proto.v1.SettingSyncMtimeMessage;

            /**
             * Encodes the specified SettingSyncMtimeMessage message. Does not implicitly {@link proto.v1.SettingSyncMtimeMessage.verify|verify} messages.
             * @param message SettingSyncMtimeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncMtimeMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncMtimeMessage message, length delimited. Does not implicitly {@link proto.v1.SettingSyncMtimeMessage.verify|verify} messages.
             * @param message SettingSyncMtimeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncMtimeMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncMtimeMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncMtimeMessage & proto.v1.SettingSyncMtimeMessage.$Shape} SettingSyncMtimeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncMtimeMessage & proto.v1.SettingSyncMtimeMessage.$Shape;

            /**
             * Decodes a SettingSyncMtimeMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncMtimeMessage & proto.v1.SettingSyncMtimeMessage.$Shape} SettingSyncMtimeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncMtimeMessage & proto.v1.SettingSyncMtimeMessage.$Shape;

            /**
             * Verifies a SettingSyncMtimeMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncMtimeMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncMtimeMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncMtimeMessage;

            /**
             * Creates a plain object from a SettingSyncMtimeMessage message. Also converts values to other types if specified.
             * @param message SettingSyncMtimeMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncMtimeMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncMtimeMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncMtimeMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncMtimeMessage {

            /** Properties of a SettingSyncMtimeMessage. */
            interface $Properties {

                /** SettingSyncMtimeMessage path */
                path?: (string|null);

                /** SettingSyncMtimeMessage ctime */
                ctime?: (number|Long|null);

                /** SettingSyncMtimeMessage mtime */
                mtime?: (number|Long|null);

                /** SettingSyncMtimeMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncMtimeMessage. */
            type $Shape = proto.v1.SettingSyncMtimeMessage.$Properties;
        }

        /**
         * Properties of a SettingSyncEndMessage.
         * @deprecated Use proto.v1.SettingSyncEndMessage.$Properties instead.
         */
        type ISettingSyncEndMessage = proto.v1.SettingSyncEndMessage.$Properties;

        /** Represents a SettingSyncEndMessage. */
        class SettingSyncEndMessage {

            /**
             * Constructs a new SettingSyncEndMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncEndMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncEndMessage lastTime. */
            lastTime: (number|Long);

            /** SettingSyncEndMessage needUploadCount. */
            needUploadCount: (number|Long);

            /** SettingSyncEndMessage needModifyCount. */
            needModifyCount: (number|Long);

            /** SettingSyncEndMessage needSyncMtimeCount. */
            needSyncMtimeCount: (number|Long);

            /** SettingSyncEndMessage needDeleteCount. */
            needDeleteCount: (number|Long);

            /**
             * Creates a new SettingSyncEndMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncEndMessage instance
             */
            static create(properties: proto.v1.SettingSyncEndMessage.$Shape): proto.v1.SettingSyncEndMessage & proto.v1.SettingSyncEndMessage.$Shape;
            static create(properties?: proto.v1.SettingSyncEndMessage.$Properties): proto.v1.SettingSyncEndMessage;

            /**
             * Encodes the specified SettingSyncEndMessage message. Does not implicitly {@link proto.v1.SettingSyncEndMessage.verify|verify} messages.
             * @param message SettingSyncEndMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncEndMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncEndMessage message, length delimited. Does not implicitly {@link proto.v1.SettingSyncEndMessage.verify|verify} messages.
             * @param message SettingSyncEndMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncEndMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncEndMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncEndMessage & proto.v1.SettingSyncEndMessage.$Shape} SettingSyncEndMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncEndMessage & proto.v1.SettingSyncEndMessage.$Shape;

            /**
             * Decodes a SettingSyncEndMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncEndMessage & proto.v1.SettingSyncEndMessage.$Shape} SettingSyncEndMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncEndMessage & proto.v1.SettingSyncEndMessage.$Shape;

            /**
             * Verifies a SettingSyncEndMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncEndMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncEndMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncEndMessage;

            /**
             * Creates a plain object from a SettingSyncEndMessage message. Also converts values to other types if specified.
             * @param message SettingSyncEndMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncEndMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncEndMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncEndMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncEndMessage {

            /** Properties of a SettingSyncEndMessage. */
            interface $Properties {

                /** SettingSyncEndMessage lastTime */
                lastTime?: (number|Long|null);

                /** SettingSyncEndMessage needUploadCount */
                needUploadCount?: (number|Long|null);

                /** SettingSyncEndMessage needModifyCount */
                needModifyCount?: (number|Long|null);

                /** SettingSyncEndMessage needSyncMtimeCount */
                needSyncMtimeCount?: (number|Long|null);

                /** SettingSyncEndMessage needDeleteCount */
                needDeleteCount?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncEndMessage. */
            type $Shape = proto.v1.SettingSyncEndMessage.$Properties;
        }

        /**
         * Properties of a SettingSyncNeedUploadMessage.
         * @deprecated Use proto.v1.SettingSyncNeedUploadMessage.$Properties instead.
         */
        type ISettingSyncNeedUploadMessage = proto.v1.SettingSyncNeedUploadMessage.$Properties;

        /** Represents a SettingSyncNeedUploadMessage. */
        class SettingSyncNeedUploadMessage {

            /**
             * Constructs a new SettingSyncNeedUploadMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncNeedUploadMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncNeedUploadMessage path. */
            path: string;

            /**
             * Creates a new SettingSyncNeedUploadMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncNeedUploadMessage instance
             */
            static create(properties: proto.v1.SettingSyncNeedUploadMessage.$Shape): proto.v1.SettingSyncNeedUploadMessage & proto.v1.SettingSyncNeedUploadMessage.$Shape;
            static create(properties?: proto.v1.SettingSyncNeedUploadMessage.$Properties): proto.v1.SettingSyncNeedUploadMessage;

            /**
             * Encodes the specified SettingSyncNeedUploadMessage message. Does not implicitly {@link proto.v1.SettingSyncNeedUploadMessage.verify|verify} messages.
             * @param message SettingSyncNeedUploadMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncNeedUploadMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncNeedUploadMessage message, length delimited. Does not implicitly {@link proto.v1.SettingSyncNeedUploadMessage.verify|verify} messages.
             * @param message SettingSyncNeedUploadMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncNeedUploadMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncNeedUploadMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncNeedUploadMessage & proto.v1.SettingSyncNeedUploadMessage.$Shape} SettingSyncNeedUploadMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncNeedUploadMessage & proto.v1.SettingSyncNeedUploadMessage.$Shape;

            /**
             * Decodes a SettingSyncNeedUploadMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncNeedUploadMessage & proto.v1.SettingSyncNeedUploadMessage.$Shape} SettingSyncNeedUploadMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncNeedUploadMessage & proto.v1.SettingSyncNeedUploadMessage.$Shape;

            /**
             * Verifies a SettingSyncNeedUploadMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncNeedUploadMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncNeedUploadMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncNeedUploadMessage;

            /**
             * Creates a plain object from a SettingSyncNeedUploadMessage message. Also converts values to other types if specified.
             * @param message SettingSyncNeedUploadMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncNeedUploadMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncNeedUploadMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncNeedUploadMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncNeedUploadMessage {

            /** Properties of a SettingSyncNeedUploadMessage. */
            interface $Properties {

                /** SettingSyncNeedUploadMessage path */
                path?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncNeedUploadMessage. */
            type $Shape = proto.v1.SettingSyncNeedUploadMessage.$Properties;
        }

        /**
         * Properties of a SettingModifyAckMessage.
         * @deprecated Use proto.v1.SettingModifyAckMessage.$Properties instead.
         */
        type ISettingModifyAckMessage = proto.v1.SettingModifyAckMessage.$Properties;

        /** Represents a SettingModifyAckMessage. */
        class SettingModifyAckMessage {

            /**
             * Constructs a new SettingModifyAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingModifyAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingModifyAckMessage lastTime. */
            lastTime: (number|Long);

            /** SettingModifyAckMessage path. */
            path: string;

            /** SettingModifyAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new SettingModifyAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingModifyAckMessage instance
             */
            static create(properties: proto.v1.SettingModifyAckMessage.$Shape): proto.v1.SettingModifyAckMessage & proto.v1.SettingModifyAckMessage.$Shape;
            static create(properties?: proto.v1.SettingModifyAckMessage.$Properties): proto.v1.SettingModifyAckMessage;

            /**
             * Encodes the specified SettingModifyAckMessage message. Does not implicitly {@link proto.v1.SettingModifyAckMessage.verify|verify} messages.
             * @param message SettingModifyAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingModifyAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingModifyAckMessage message, length delimited. Does not implicitly {@link proto.v1.SettingModifyAckMessage.verify|verify} messages.
             * @param message SettingModifyAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingModifyAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingModifyAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingModifyAckMessage & proto.v1.SettingModifyAckMessage.$Shape} SettingModifyAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingModifyAckMessage & proto.v1.SettingModifyAckMessage.$Shape;

            /**
             * Decodes a SettingModifyAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingModifyAckMessage & proto.v1.SettingModifyAckMessage.$Shape} SettingModifyAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingModifyAckMessage & proto.v1.SettingModifyAckMessage.$Shape;

            /**
             * Verifies a SettingModifyAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingModifyAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingModifyAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingModifyAckMessage;

            /**
             * Creates a plain object from a SettingModifyAckMessage message. Also converts values to other types if specified.
             * @param message SettingModifyAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingModifyAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingModifyAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingModifyAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingModifyAckMessage {

            /** Properties of a SettingModifyAckMessage. */
            interface $Properties {

                /** SettingModifyAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** SettingModifyAckMessage path */
                path?: (string|null);

                /** SettingModifyAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingModifyAckMessage. */
            type $Shape = proto.v1.SettingModifyAckMessage.$Properties;
        }

        /**
         * Properties of a SettingDeleteAckMessage.
         * @deprecated Use proto.v1.SettingDeleteAckMessage.$Properties instead.
         */
        type ISettingDeleteAckMessage = proto.v1.SettingDeleteAckMessage.$Properties;

        /** Represents a SettingDeleteAckMessage. */
        class SettingDeleteAckMessage {

            /**
             * Constructs a new SettingDeleteAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingDeleteAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingDeleteAckMessage lastTime. */
            lastTime: (number|Long);

            /** SettingDeleteAckMessage path. */
            path: string;

            /** SettingDeleteAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new SettingDeleteAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingDeleteAckMessage instance
             */
            static create(properties: proto.v1.SettingDeleteAckMessage.$Shape): proto.v1.SettingDeleteAckMessage & proto.v1.SettingDeleteAckMessage.$Shape;
            static create(properties?: proto.v1.SettingDeleteAckMessage.$Properties): proto.v1.SettingDeleteAckMessage;

            /**
             * Encodes the specified SettingDeleteAckMessage message. Does not implicitly {@link proto.v1.SettingDeleteAckMessage.verify|verify} messages.
             * @param message SettingDeleteAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingDeleteAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingDeleteAckMessage message, length delimited. Does not implicitly {@link proto.v1.SettingDeleteAckMessage.verify|verify} messages.
             * @param message SettingDeleteAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingDeleteAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingDeleteAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingDeleteAckMessage & proto.v1.SettingDeleteAckMessage.$Shape} SettingDeleteAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingDeleteAckMessage & proto.v1.SettingDeleteAckMessage.$Shape;

            /**
             * Decodes a SettingDeleteAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingDeleteAckMessage & proto.v1.SettingDeleteAckMessage.$Shape} SettingDeleteAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingDeleteAckMessage & proto.v1.SettingDeleteAckMessage.$Shape;

            /**
             * Verifies a SettingDeleteAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingDeleteAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingDeleteAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingDeleteAckMessage;

            /**
             * Creates a plain object from a SettingDeleteAckMessage message. Also converts values to other types if specified.
             * @param message SettingDeleteAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingDeleteAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingDeleteAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingDeleteAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingDeleteAckMessage {

            /** Properties of a SettingDeleteAckMessage. */
            interface $Properties {

                /** SettingDeleteAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** SettingDeleteAckMessage path */
                path?: (string|null);

                /** SettingDeleteAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingDeleteAckMessage. */
            type $Shape = proto.v1.SettingDeleteAckMessage.$Properties;
        }

        /**
         * Properties of a FolderSyncCheckRequest.
         * @deprecated Use proto.v1.FolderSyncCheckRequest.$Properties instead.
         */
        type IFolderSyncCheckRequest = proto.v1.FolderSyncCheckRequest.$Properties;

        /** Represents a FolderSyncCheckRequest. */
        class FolderSyncCheckRequest {

            /**
             * Constructs a new FolderSyncCheckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderSyncCheckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderSyncCheckRequest path. */
            path: string;

            /** FolderSyncCheckRequest pathHash. */
            pathHash: string;

            /** FolderSyncCheckRequest mtime. */
            mtime: (number|Long);

            /**
             * Creates a new FolderSyncCheckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderSyncCheckRequest instance
             */
            static create(properties: proto.v1.FolderSyncCheckRequest.$Shape): proto.v1.FolderSyncCheckRequest & proto.v1.FolderSyncCheckRequest.$Shape;
            static create(properties?: proto.v1.FolderSyncCheckRequest.$Properties): proto.v1.FolderSyncCheckRequest;

            /**
             * Encodes the specified FolderSyncCheckRequest message. Does not implicitly {@link proto.v1.FolderSyncCheckRequest.verify|verify} messages.
             * @param message FolderSyncCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderSyncCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderSyncCheckRequest message, length delimited. Does not implicitly {@link proto.v1.FolderSyncCheckRequest.verify|verify} messages.
             * @param message FolderSyncCheckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderSyncCheckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderSyncCheckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderSyncCheckRequest & proto.v1.FolderSyncCheckRequest.$Shape} FolderSyncCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderSyncCheckRequest & proto.v1.FolderSyncCheckRequest.$Shape;

            /**
             * Decodes a FolderSyncCheckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderSyncCheckRequest & proto.v1.FolderSyncCheckRequest.$Shape} FolderSyncCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderSyncCheckRequest & proto.v1.FolderSyncCheckRequest.$Shape;

            /**
             * Verifies a FolderSyncCheckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderSyncCheckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderSyncCheckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderSyncCheckRequest;

            /**
             * Creates a plain object from a FolderSyncCheckRequest message. Also converts values to other types if specified.
             * @param message FolderSyncCheckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderSyncCheckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderSyncCheckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderSyncCheckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderSyncCheckRequest {

            /** Properties of a FolderSyncCheckRequest. */
            interface $Properties {

                /** FolderSyncCheckRequest path */
                path?: (string|null);

                /** FolderSyncCheckRequest pathHash */
                pathHash?: (string|null);

                /** FolderSyncCheckRequest mtime */
                mtime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderSyncCheckRequest. */
            type $Shape = proto.v1.FolderSyncCheckRequest.$Properties;
        }

        /**
         * Properties of a FolderSyncDelFolder.
         * @deprecated Use proto.v1.FolderSyncDelFolder.$Properties instead.
         */
        type IFolderSyncDelFolder = proto.v1.FolderSyncDelFolder.$Properties;

        /** Represents a FolderSyncDelFolder. */
        class FolderSyncDelFolder {

            /**
             * Constructs a new FolderSyncDelFolder.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderSyncDelFolder.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderSyncDelFolder path. */
            path: string;

            /** FolderSyncDelFolder pathHash. */
            pathHash: string;

            /**
             * Creates a new FolderSyncDelFolder instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderSyncDelFolder instance
             */
            static create(properties: proto.v1.FolderSyncDelFolder.$Shape): proto.v1.FolderSyncDelFolder & proto.v1.FolderSyncDelFolder.$Shape;
            static create(properties?: proto.v1.FolderSyncDelFolder.$Properties): proto.v1.FolderSyncDelFolder;

            /**
             * Encodes the specified FolderSyncDelFolder message. Does not implicitly {@link proto.v1.FolderSyncDelFolder.verify|verify} messages.
             * @param message FolderSyncDelFolder message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderSyncDelFolder.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderSyncDelFolder message, length delimited. Does not implicitly {@link proto.v1.FolderSyncDelFolder.verify|verify} messages.
             * @param message FolderSyncDelFolder message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderSyncDelFolder.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderSyncDelFolder message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderSyncDelFolder & proto.v1.FolderSyncDelFolder.$Shape} FolderSyncDelFolder
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderSyncDelFolder & proto.v1.FolderSyncDelFolder.$Shape;

            /**
             * Decodes a FolderSyncDelFolder message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderSyncDelFolder & proto.v1.FolderSyncDelFolder.$Shape} FolderSyncDelFolder
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderSyncDelFolder & proto.v1.FolderSyncDelFolder.$Shape;

            /**
             * Verifies a FolderSyncDelFolder message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderSyncDelFolder message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderSyncDelFolder
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderSyncDelFolder;

            /**
             * Creates a plain object from a FolderSyncDelFolder message. Also converts values to other types if specified.
             * @param message FolderSyncDelFolder
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderSyncDelFolder, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderSyncDelFolder to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderSyncDelFolder
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderSyncDelFolder {

            /** Properties of a FolderSyncDelFolder. */
            interface $Properties {

                /** FolderSyncDelFolder path */
                path?: (string|null);

                /** FolderSyncDelFolder pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderSyncDelFolder. */
            type $Shape = proto.v1.FolderSyncDelFolder.$Properties;
        }

        /**
         * Properties of a FolderSyncRequest.
         * @deprecated Use proto.v1.FolderSyncRequest.$Properties instead.
         */
        type IFolderSyncRequest = proto.v1.FolderSyncRequest.$Properties;

        /** Represents a FolderSyncRequest. */
        class FolderSyncRequest {

            /**
             * Constructs a new FolderSyncRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderSyncRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderSyncRequest context. */
            context: string;

            /** FolderSyncRequest vault. */
            vault: string;

            /** FolderSyncRequest lastTime. */
            lastTime: (number|Long);

            /** FolderSyncRequest folders. */
            folders: proto.v1.FolderSyncCheckRequest.$Properties[];

            /** FolderSyncRequest delFolders. */
            delFolders: proto.v1.FolderSyncDelFolder.$Properties[];

            /** FolderSyncRequest missingFolders. */
            missingFolders: proto.v1.FolderSyncDelFolder.$Properties[];

            /** FolderSyncRequest batchIndex. */
            batchIndex: number;

            /** FolderSyncRequest totalBatches. */
            totalBatches: number;

            /**
             * Creates a new FolderSyncRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderSyncRequest instance
             */
            static create(properties: proto.v1.FolderSyncRequest.$Shape): proto.v1.FolderSyncRequest & proto.v1.FolderSyncRequest.$Shape;
            static create(properties?: proto.v1.FolderSyncRequest.$Properties): proto.v1.FolderSyncRequest;

            /**
             * Encodes the specified FolderSyncRequest message. Does not implicitly {@link proto.v1.FolderSyncRequest.verify|verify} messages.
             * @param message FolderSyncRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderSyncRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderSyncRequest message, length delimited. Does not implicitly {@link proto.v1.FolderSyncRequest.verify|verify} messages.
             * @param message FolderSyncRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderSyncRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderSyncRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderSyncRequest & proto.v1.FolderSyncRequest.$Shape} FolderSyncRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderSyncRequest & proto.v1.FolderSyncRequest.$Shape;

            /**
             * Decodes a FolderSyncRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderSyncRequest & proto.v1.FolderSyncRequest.$Shape} FolderSyncRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderSyncRequest & proto.v1.FolderSyncRequest.$Shape;

            /**
             * Verifies a FolderSyncRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderSyncRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderSyncRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderSyncRequest;

            /**
             * Creates a plain object from a FolderSyncRequest message. Also converts values to other types if specified.
             * @param message FolderSyncRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderSyncRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderSyncRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderSyncRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderSyncRequest {

            /** Properties of a FolderSyncRequest. */
            interface $Properties {

                /** FolderSyncRequest context */
                context?: (string|null);

                /** FolderSyncRequest vault */
                vault?: (string|null);

                /** FolderSyncRequest lastTime */
                lastTime?: (number|Long|null);

                /** FolderSyncRequest folders */
                folders?: (proto.v1.FolderSyncCheckRequest.$Properties[]|null);

                /** FolderSyncRequest delFolders */
                delFolders?: (proto.v1.FolderSyncDelFolder.$Properties[]|null);

                /** FolderSyncRequest missingFolders */
                missingFolders?: (proto.v1.FolderSyncDelFolder.$Properties[]|null);

                /** FolderSyncRequest batchIndex */
                batchIndex?: (number|null);

                /** FolderSyncRequest totalBatches */
                totalBatches?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderSyncRequest. */
            type $Shape = proto.v1.FolderSyncRequest.$Properties;
        }

        /**
         * Properties of a FolderCreateRequest.
         * @deprecated Use proto.v1.FolderCreateRequest.$Properties instead.
         */
        type IFolderCreateRequest = proto.v1.FolderCreateRequest.$Properties;

        /** Represents a FolderCreateRequest. */
        class FolderCreateRequest {

            /**
             * Constructs a new FolderCreateRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderCreateRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderCreateRequest vault. */
            vault: string;

            /** FolderCreateRequest path. */
            path: string;

            /** FolderCreateRequest pathHash. */
            pathHash: string;

            /** FolderCreateRequest context. */
            context: string;

            /**
             * Creates a new FolderCreateRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderCreateRequest instance
             */
            static create(properties: proto.v1.FolderCreateRequest.$Shape): proto.v1.FolderCreateRequest & proto.v1.FolderCreateRequest.$Shape;
            static create(properties?: proto.v1.FolderCreateRequest.$Properties): proto.v1.FolderCreateRequest;

            /**
             * Encodes the specified FolderCreateRequest message. Does not implicitly {@link proto.v1.FolderCreateRequest.verify|verify} messages.
             * @param message FolderCreateRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderCreateRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderCreateRequest message, length delimited. Does not implicitly {@link proto.v1.FolderCreateRequest.verify|verify} messages.
             * @param message FolderCreateRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderCreateRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderCreateRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderCreateRequest & proto.v1.FolderCreateRequest.$Shape} FolderCreateRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderCreateRequest & proto.v1.FolderCreateRequest.$Shape;

            /**
             * Decodes a FolderCreateRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderCreateRequest & proto.v1.FolderCreateRequest.$Shape} FolderCreateRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderCreateRequest & proto.v1.FolderCreateRequest.$Shape;

            /**
             * Verifies a FolderCreateRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderCreateRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderCreateRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderCreateRequest;

            /**
             * Creates a plain object from a FolderCreateRequest message. Also converts values to other types if specified.
             * @param message FolderCreateRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderCreateRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderCreateRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderCreateRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderCreateRequest {

            /** Properties of a FolderCreateRequest. */
            interface $Properties {

                /** FolderCreateRequest vault */
                vault?: (string|null);

                /** FolderCreateRequest path */
                path?: (string|null);

                /** FolderCreateRequest pathHash */
                pathHash?: (string|null);

                /** FolderCreateRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderCreateRequest. */
            type $Shape = proto.v1.FolderCreateRequest.$Properties;
        }

        /**
         * Properties of a FolderDeleteRequest.
         * @deprecated Use proto.v1.FolderDeleteRequest.$Properties instead.
         */
        type IFolderDeleteRequest = proto.v1.FolderDeleteRequest.$Properties;

        /** Represents a FolderDeleteRequest. */
        class FolderDeleteRequest {

            /**
             * Constructs a new FolderDeleteRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderDeleteRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderDeleteRequest vault. */
            vault: string;

            /** FolderDeleteRequest path. */
            path: string;

            /** FolderDeleteRequest pathHash. */
            pathHash: string;

            /** FolderDeleteRequest context. */
            context: string;

            /**
             * Creates a new FolderDeleteRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderDeleteRequest instance
             */
            static create(properties: proto.v1.FolderDeleteRequest.$Shape): proto.v1.FolderDeleteRequest & proto.v1.FolderDeleteRequest.$Shape;
            static create(properties?: proto.v1.FolderDeleteRequest.$Properties): proto.v1.FolderDeleteRequest;

            /**
             * Encodes the specified FolderDeleteRequest message. Does not implicitly {@link proto.v1.FolderDeleteRequest.verify|verify} messages.
             * @param message FolderDeleteRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderDeleteRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderDeleteRequest message, length delimited. Does not implicitly {@link proto.v1.FolderDeleteRequest.verify|verify} messages.
             * @param message FolderDeleteRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderDeleteRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderDeleteRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderDeleteRequest & proto.v1.FolderDeleteRequest.$Shape} FolderDeleteRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderDeleteRequest & proto.v1.FolderDeleteRequest.$Shape;

            /**
             * Decodes a FolderDeleteRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderDeleteRequest & proto.v1.FolderDeleteRequest.$Shape} FolderDeleteRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderDeleteRequest & proto.v1.FolderDeleteRequest.$Shape;

            /**
             * Verifies a FolderDeleteRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderDeleteRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderDeleteRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderDeleteRequest;

            /**
             * Creates a plain object from a FolderDeleteRequest message. Also converts values to other types if specified.
             * @param message FolderDeleteRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderDeleteRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderDeleteRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderDeleteRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderDeleteRequest {

            /** Properties of a FolderDeleteRequest. */
            interface $Properties {

                /** FolderDeleteRequest vault */
                vault?: (string|null);

                /** FolderDeleteRequest path */
                path?: (string|null);

                /** FolderDeleteRequest pathHash */
                pathHash?: (string|null);

                /** FolderDeleteRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderDeleteRequest. */
            type $Shape = proto.v1.FolderDeleteRequest.$Properties;
        }

        /**
         * Properties of a FolderRenameRequest.
         * @deprecated Use proto.v1.FolderRenameRequest.$Properties instead.
         */
        type IFolderRenameRequest = proto.v1.FolderRenameRequest.$Properties;

        /** Represents a FolderRenameRequest. */
        class FolderRenameRequest {

            /**
             * Constructs a new FolderRenameRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderRenameRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderRenameRequest vault. */
            vault: string;

            /** FolderRenameRequest path. */
            path: string;

            /** FolderRenameRequest pathHash. */
            pathHash: string;

            /** FolderRenameRequest oldPath. */
            oldPath: string;

            /** FolderRenameRequest oldPathHash. */
            oldPathHash: string;

            /** FolderRenameRequest context. */
            context: string;

            /**
             * Creates a new FolderRenameRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderRenameRequest instance
             */
            static create(properties: proto.v1.FolderRenameRequest.$Shape): proto.v1.FolderRenameRequest & proto.v1.FolderRenameRequest.$Shape;
            static create(properties?: proto.v1.FolderRenameRequest.$Properties): proto.v1.FolderRenameRequest;

            /**
             * Encodes the specified FolderRenameRequest message. Does not implicitly {@link proto.v1.FolderRenameRequest.verify|verify} messages.
             * @param message FolderRenameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderRenameRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderRenameRequest message, length delimited. Does not implicitly {@link proto.v1.FolderRenameRequest.verify|verify} messages.
             * @param message FolderRenameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderRenameRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderRenameRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderRenameRequest & proto.v1.FolderRenameRequest.$Shape} FolderRenameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderRenameRequest & proto.v1.FolderRenameRequest.$Shape;

            /**
             * Decodes a FolderRenameRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderRenameRequest & proto.v1.FolderRenameRequest.$Shape} FolderRenameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderRenameRequest & proto.v1.FolderRenameRequest.$Shape;

            /**
             * Verifies a FolderRenameRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderRenameRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderRenameRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderRenameRequest;

            /**
             * Creates a plain object from a FolderRenameRequest message. Also converts values to other types if specified.
             * @param message FolderRenameRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderRenameRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderRenameRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderRenameRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderRenameRequest {

            /** Properties of a FolderRenameRequest. */
            interface $Properties {

                /** FolderRenameRequest vault */
                vault?: (string|null);

                /** FolderRenameRequest path */
                path?: (string|null);

                /** FolderRenameRequest pathHash */
                pathHash?: (string|null);

                /** FolderRenameRequest oldPath */
                oldPath?: (string|null);

                /** FolderRenameRequest oldPathHash */
                oldPathHash?: (string|null);

                /** FolderRenameRequest context */
                context?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderRenameRequest. */
            type $Shape = proto.v1.FolderRenameRequest.$Properties;
        }

        /**
         * Properties of a FolderSyncModifyMessage.
         * @deprecated Use proto.v1.FolderSyncModifyMessage.$Properties instead.
         */
        type IFolderSyncModifyMessage = proto.v1.FolderSyncModifyMessage.$Properties;

        /** Represents a FolderSyncModifyMessage. */
        class FolderSyncModifyMessage {

            /**
             * Constructs a new FolderSyncModifyMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderSyncModifyMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderSyncModifyMessage path. */
            path: string;

            /** FolderSyncModifyMessage pathHash. */
            pathHash: string;

            /** FolderSyncModifyMessage ctime. */
            ctime: (number|Long);

            /** FolderSyncModifyMessage mtime. */
            mtime: (number|Long);

            /** FolderSyncModifyMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new FolderSyncModifyMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderSyncModifyMessage instance
             */
            static create(properties: proto.v1.FolderSyncModifyMessage.$Shape): proto.v1.FolderSyncModifyMessage & proto.v1.FolderSyncModifyMessage.$Shape;
            static create(properties?: proto.v1.FolderSyncModifyMessage.$Properties): proto.v1.FolderSyncModifyMessage;

            /**
             * Encodes the specified FolderSyncModifyMessage message. Does not implicitly {@link proto.v1.FolderSyncModifyMessage.verify|verify} messages.
             * @param message FolderSyncModifyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderSyncModifyMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderSyncModifyMessage message, length delimited. Does not implicitly {@link proto.v1.FolderSyncModifyMessage.verify|verify} messages.
             * @param message FolderSyncModifyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderSyncModifyMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderSyncModifyMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderSyncModifyMessage & proto.v1.FolderSyncModifyMessage.$Shape} FolderSyncModifyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderSyncModifyMessage & proto.v1.FolderSyncModifyMessage.$Shape;

            /**
             * Decodes a FolderSyncModifyMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderSyncModifyMessage & proto.v1.FolderSyncModifyMessage.$Shape} FolderSyncModifyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderSyncModifyMessage & proto.v1.FolderSyncModifyMessage.$Shape;

            /**
             * Verifies a FolderSyncModifyMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderSyncModifyMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderSyncModifyMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderSyncModifyMessage;

            /**
             * Creates a plain object from a FolderSyncModifyMessage message. Also converts values to other types if specified.
             * @param message FolderSyncModifyMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderSyncModifyMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderSyncModifyMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderSyncModifyMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderSyncModifyMessage {

            /** Properties of a FolderSyncModifyMessage. */
            interface $Properties {

                /** FolderSyncModifyMessage path */
                path?: (string|null);

                /** FolderSyncModifyMessage pathHash */
                pathHash?: (string|null);

                /** FolderSyncModifyMessage ctime */
                ctime?: (number|Long|null);

                /** FolderSyncModifyMessage mtime */
                mtime?: (number|Long|null);

                /** FolderSyncModifyMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderSyncModifyMessage. */
            type $Shape = proto.v1.FolderSyncModifyMessage.$Properties;
        }

        /**
         * Properties of a FolderSyncDeleteMessage.
         * @deprecated Use proto.v1.FolderSyncDeleteMessage.$Properties instead.
         */
        type IFolderSyncDeleteMessage = proto.v1.FolderSyncDeleteMessage.$Properties;

        /** Represents a FolderSyncDeleteMessage. */
        class FolderSyncDeleteMessage {

            /**
             * Constructs a new FolderSyncDeleteMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderSyncDeleteMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderSyncDeleteMessage path. */
            path: string;

            /** FolderSyncDeleteMessage pathHash. */
            pathHash: string;

            /** FolderSyncDeleteMessage ctime. */
            ctime: (number|Long);

            /** FolderSyncDeleteMessage mtime. */
            mtime: (number|Long);

            /** FolderSyncDeleteMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new FolderSyncDeleteMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderSyncDeleteMessage instance
             */
            static create(properties: proto.v1.FolderSyncDeleteMessage.$Shape): proto.v1.FolderSyncDeleteMessage & proto.v1.FolderSyncDeleteMessage.$Shape;
            static create(properties?: proto.v1.FolderSyncDeleteMessage.$Properties): proto.v1.FolderSyncDeleteMessage;

            /**
             * Encodes the specified FolderSyncDeleteMessage message. Does not implicitly {@link proto.v1.FolderSyncDeleteMessage.verify|verify} messages.
             * @param message FolderSyncDeleteMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderSyncDeleteMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderSyncDeleteMessage message, length delimited. Does not implicitly {@link proto.v1.FolderSyncDeleteMessage.verify|verify} messages.
             * @param message FolderSyncDeleteMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderSyncDeleteMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderSyncDeleteMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderSyncDeleteMessage & proto.v1.FolderSyncDeleteMessage.$Shape} FolderSyncDeleteMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderSyncDeleteMessage & proto.v1.FolderSyncDeleteMessage.$Shape;

            /**
             * Decodes a FolderSyncDeleteMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderSyncDeleteMessage & proto.v1.FolderSyncDeleteMessage.$Shape} FolderSyncDeleteMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderSyncDeleteMessage & proto.v1.FolderSyncDeleteMessage.$Shape;

            /**
             * Verifies a FolderSyncDeleteMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderSyncDeleteMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderSyncDeleteMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderSyncDeleteMessage;

            /**
             * Creates a plain object from a FolderSyncDeleteMessage message. Also converts values to other types if specified.
             * @param message FolderSyncDeleteMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderSyncDeleteMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderSyncDeleteMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderSyncDeleteMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderSyncDeleteMessage {

            /** Properties of a FolderSyncDeleteMessage. */
            interface $Properties {

                /** FolderSyncDeleteMessage path */
                path?: (string|null);

                /** FolderSyncDeleteMessage pathHash */
                pathHash?: (string|null);

                /** FolderSyncDeleteMessage ctime */
                ctime?: (number|Long|null);

                /** FolderSyncDeleteMessage mtime */
                mtime?: (number|Long|null);

                /** FolderSyncDeleteMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderSyncDeleteMessage. */
            type $Shape = proto.v1.FolderSyncDeleteMessage.$Properties;
        }

        /**
         * Properties of a FolderSyncRenameMessage.
         * @deprecated Use proto.v1.FolderSyncRenameMessage.$Properties instead.
         */
        type IFolderSyncRenameMessage = proto.v1.FolderSyncRenameMessage.$Properties;

        /** Represents a FolderSyncRenameMessage. */
        class FolderSyncRenameMessage {

            /**
             * Constructs a new FolderSyncRenameMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderSyncRenameMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderSyncRenameMessage path. */
            path: string;

            /** FolderSyncRenameMessage pathHash. */
            pathHash: string;

            /** FolderSyncRenameMessage ctime. */
            ctime: (number|Long);

            /** FolderSyncRenameMessage mtime. */
            mtime: (number|Long);

            /** FolderSyncRenameMessage oldPath. */
            oldPath: string;

            /** FolderSyncRenameMessage oldPathHash. */
            oldPathHash: string;

            /** FolderSyncRenameMessage lastTime. */
            lastTime: (number|Long);

            /**
             * Creates a new FolderSyncRenameMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderSyncRenameMessage instance
             */
            static create(properties: proto.v1.FolderSyncRenameMessage.$Shape): proto.v1.FolderSyncRenameMessage & proto.v1.FolderSyncRenameMessage.$Shape;
            static create(properties?: proto.v1.FolderSyncRenameMessage.$Properties): proto.v1.FolderSyncRenameMessage;

            /**
             * Encodes the specified FolderSyncRenameMessage message. Does not implicitly {@link proto.v1.FolderSyncRenameMessage.verify|verify} messages.
             * @param message FolderSyncRenameMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderSyncRenameMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderSyncRenameMessage message, length delimited. Does not implicitly {@link proto.v1.FolderSyncRenameMessage.verify|verify} messages.
             * @param message FolderSyncRenameMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderSyncRenameMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderSyncRenameMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderSyncRenameMessage & proto.v1.FolderSyncRenameMessage.$Shape} FolderSyncRenameMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderSyncRenameMessage & proto.v1.FolderSyncRenameMessage.$Shape;

            /**
             * Decodes a FolderSyncRenameMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderSyncRenameMessage & proto.v1.FolderSyncRenameMessage.$Shape} FolderSyncRenameMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderSyncRenameMessage & proto.v1.FolderSyncRenameMessage.$Shape;

            /**
             * Verifies a FolderSyncRenameMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderSyncRenameMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderSyncRenameMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderSyncRenameMessage;

            /**
             * Creates a plain object from a FolderSyncRenameMessage message. Also converts values to other types if specified.
             * @param message FolderSyncRenameMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderSyncRenameMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderSyncRenameMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderSyncRenameMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderSyncRenameMessage {

            /** Properties of a FolderSyncRenameMessage. */
            interface $Properties {

                /** FolderSyncRenameMessage path */
                path?: (string|null);

                /** FolderSyncRenameMessage pathHash */
                pathHash?: (string|null);

                /** FolderSyncRenameMessage ctime */
                ctime?: (number|Long|null);

                /** FolderSyncRenameMessage mtime */
                mtime?: (number|Long|null);

                /** FolderSyncRenameMessage oldPath */
                oldPath?: (string|null);

                /** FolderSyncRenameMessage oldPathHash */
                oldPathHash?: (string|null);

                /** FolderSyncRenameMessage lastTime */
                lastTime?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderSyncRenameMessage. */
            type $Shape = proto.v1.FolderSyncRenameMessage.$Properties;
        }

        /**
         * Properties of a FolderSyncEndMessage.
         * @deprecated Use proto.v1.FolderSyncEndMessage.$Properties instead.
         */
        type IFolderSyncEndMessage = proto.v1.FolderSyncEndMessage.$Properties;

        /** Represents a FolderSyncEndMessage. */
        class FolderSyncEndMessage {

            /**
             * Constructs a new FolderSyncEndMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderSyncEndMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderSyncEndMessage lastTime. */
            lastTime: (number|Long);

            /** FolderSyncEndMessage needModifyCount. */
            needModifyCount: (number|Long);

            /** FolderSyncEndMessage needDeleteCount. */
            needDeleteCount: (number|Long);

            /**
             * Creates a new FolderSyncEndMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderSyncEndMessage instance
             */
            static create(properties: proto.v1.FolderSyncEndMessage.$Shape): proto.v1.FolderSyncEndMessage & proto.v1.FolderSyncEndMessage.$Shape;
            static create(properties?: proto.v1.FolderSyncEndMessage.$Properties): proto.v1.FolderSyncEndMessage;

            /**
             * Encodes the specified FolderSyncEndMessage message. Does not implicitly {@link proto.v1.FolderSyncEndMessage.verify|verify} messages.
             * @param message FolderSyncEndMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderSyncEndMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderSyncEndMessage message, length delimited. Does not implicitly {@link proto.v1.FolderSyncEndMessage.verify|verify} messages.
             * @param message FolderSyncEndMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderSyncEndMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderSyncEndMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderSyncEndMessage & proto.v1.FolderSyncEndMessage.$Shape} FolderSyncEndMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderSyncEndMessage & proto.v1.FolderSyncEndMessage.$Shape;

            /**
             * Decodes a FolderSyncEndMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderSyncEndMessage & proto.v1.FolderSyncEndMessage.$Shape} FolderSyncEndMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderSyncEndMessage & proto.v1.FolderSyncEndMessage.$Shape;

            /**
             * Verifies a FolderSyncEndMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderSyncEndMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderSyncEndMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderSyncEndMessage;

            /**
             * Creates a plain object from a FolderSyncEndMessage message. Also converts values to other types if specified.
             * @param message FolderSyncEndMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderSyncEndMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderSyncEndMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderSyncEndMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderSyncEndMessage {

            /** Properties of a FolderSyncEndMessage. */
            interface $Properties {

                /** FolderSyncEndMessage lastTime */
                lastTime?: (number|Long|null);

                /** FolderSyncEndMessage needModifyCount */
                needModifyCount?: (number|Long|null);

                /** FolderSyncEndMessage needDeleteCount */
                needDeleteCount?: (number|Long|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderSyncEndMessage. */
            type $Shape = proto.v1.FolderSyncEndMessage.$Properties;
        }

        /**
         * Properties of a FolderModifyAckMessage.
         * @deprecated Use proto.v1.FolderModifyAckMessage.$Properties instead.
         */
        type IFolderModifyAckMessage = proto.v1.FolderModifyAckMessage.$Properties;

        /** Represents a FolderModifyAckMessage. */
        class FolderModifyAckMessage {

            /**
             * Constructs a new FolderModifyAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderModifyAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderModifyAckMessage lastTime. */
            lastTime: (number|Long);

            /** FolderModifyAckMessage path. */
            path: string;

            /** FolderModifyAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new FolderModifyAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderModifyAckMessage instance
             */
            static create(properties: proto.v1.FolderModifyAckMessage.$Shape): proto.v1.FolderModifyAckMessage & proto.v1.FolderModifyAckMessage.$Shape;
            static create(properties?: proto.v1.FolderModifyAckMessage.$Properties): proto.v1.FolderModifyAckMessage;

            /**
             * Encodes the specified FolderModifyAckMessage message. Does not implicitly {@link proto.v1.FolderModifyAckMessage.verify|verify} messages.
             * @param message FolderModifyAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderModifyAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderModifyAckMessage message, length delimited. Does not implicitly {@link proto.v1.FolderModifyAckMessage.verify|verify} messages.
             * @param message FolderModifyAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderModifyAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderModifyAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderModifyAckMessage & proto.v1.FolderModifyAckMessage.$Shape} FolderModifyAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderModifyAckMessage & proto.v1.FolderModifyAckMessage.$Shape;

            /**
             * Decodes a FolderModifyAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderModifyAckMessage & proto.v1.FolderModifyAckMessage.$Shape} FolderModifyAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderModifyAckMessage & proto.v1.FolderModifyAckMessage.$Shape;

            /**
             * Verifies a FolderModifyAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderModifyAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderModifyAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderModifyAckMessage;

            /**
             * Creates a plain object from a FolderModifyAckMessage message. Also converts values to other types if specified.
             * @param message FolderModifyAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderModifyAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderModifyAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderModifyAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderModifyAckMessage {

            /** Properties of a FolderModifyAckMessage. */
            interface $Properties {

                /** FolderModifyAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** FolderModifyAckMessage path */
                path?: (string|null);

                /** FolderModifyAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderModifyAckMessage. */
            type $Shape = proto.v1.FolderModifyAckMessage.$Properties;
        }

        /**
         * Properties of a FolderRenameAckMessage.
         * @deprecated Use proto.v1.FolderRenameAckMessage.$Properties instead.
         */
        type IFolderRenameAckMessage = proto.v1.FolderRenameAckMessage.$Properties;

        /** Represents a FolderRenameAckMessage. */
        class FolderRenameAckMessage {

            /**
             * Constructs a new FolderRenameAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderRenameAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderRenameAckMessage lastTime. */
            lastTime: (number|Long);

            /** FolderRenameAckMessage path. */
            path: string;

            /** FolderRenameAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new FolderRenameAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderRenameAckMessage instance
             */
            static create(properties: proto.v1.FolderRenameAckMessage.$Shape): proto.v1.FolderRenameAckMessage & proto.v1.FolderRenameAckMessage.$Shape;
            static create(properties?: proto.v1.FolderRenameAckMessage.$Properties): proto.v1.FolderRenameAckMessage;

            /**
             * Encodes the specified FolderRenameAckMessage message. Does not implicitly {@link proto.v1.FolderRenameAckMessage.verify|verify} messages.
             * @param message FolderRenameAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderRenameAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderRenameAckMessage message, length delimited. Does not implicitly {@link proto.v1.FolderRenameAckMessage.verify|verify} messages.
             * @param message FolderRenameAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderRenameAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderRenameAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderRenameAckMessage & proto.v1.FolderRenameAckMessage.$Shape} FolderRenameAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderRenameAckMessage & proto.v1.FolderRenameAckMessage.$Shape;

            /**
             * Decodes a FolderRenameAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderRenameAckMessage & proto.v1.FolderRenameAckMessage.$Shape} FolderRenameAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderRenameAckMessage & proto.v1.FolderRenameAckMessage.$Shape;

            /**
             * Verifies a FolderRenameAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderRenameAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderRenameAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderRenameAckMessage;

            /**
             * Creates a plain object from a FolderRenameAckMessage message. Also converts values to other types if specified.
             * @param message FolderRenameAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderRenameAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderRenameAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderRenameAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderRenameAckMessage {

            /** Properties of a FolderRenameAckMessage. */
            interface $Properties {

                /** FolderRenameAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** FolderRenameAckMessage path */
                path?: (string|null);

                /** FolderRenameAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderRenameAckMessage. */
            type $Shape = proto.v1.FolderRenameAckMessage.$Properties;
        }

        /**
         * Properties of a FolderDeleteAckMessage.
         * @deprecated Use proto.v1.FolderDeleteAckMessage.$Properties instead.
         */
        type IFolderDeleteAckMessage = proto.v1.FolderDeleteAckMessage.$Properties;

        /** Represents a FolderDeleteAckMessage. */
        class FolderDeleteAckMessage {

            /**
             * Constructs a new FolderDeleteAckMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderDeleteAckMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderDeleteAckMessage lastTime. */
            lastTime: (number|Long);

            /** FolderDeleteAckMessage path. */
            path: string;

            /** FolderDeleteAckMessage pathHash. */
            pathHash: string;

            /**
             * Creates a new FolderDeleteAckMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderDeleteAckMessage instance
             */
            static create(properties: proto.v1.FolderDeleteAckMessage.$Shape): proto.v1.FolderDeleteAckMessage & proto.v1.FolderDeleteAckMessage.$Shape;
            static create(properties?: proto.v1.FolderDeleteAckMessage.$Properties): proto.v1.FolderDeleteAckMessage;

            /**
             * Encodes the specified FolderDeleteAckMessage message. Does not implicitly {@link proto.v1.FolderDeleteAckMessage.verify|verify} messages.
             * @param message FolderDeleteAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderDeleteAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderDeleteAckMessage message, length delimited. Does not implicitly {@link proto.v1.FolderDeleteAckMessage.verify|verify} messages.
             * @param message FolderDeleteAckMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderDeleteAckMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderDeleteAckMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderDeleteAckMessage & proto.v1.FolderDeleteAckMessage.$Shape} FolderDeleteAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderDeleteAckMessage & proto.v1.FolderDeleteAckMessage.$Shape;

            /**
             * Decodes a FolderDeleteAckMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderDeleteAckMessage & proto.v1.FolderDeleteAckMessage.$Shape} FolderDeleteAckMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderDeleteAckMessage & proto.v1.FolderDeleteAckMessage.$Shape;

            /**
             * Verifies a FolderDeleteAckMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderDeleteAckMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderDeleteAckMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderDeleteAckMessage;

            /**
             * Creates a plain object from a FolderDeleteAckMessage message. Also converts values to other types if specified.
             * @param message FolderDeleteAckMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderDeleteAckMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderDeleteAckMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderDeleteAckMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderDeleteAckMessage {

            /** Properties of a FolderDeleteAckMessage. */
            interface $Properties {

                /** FolderDeleteAckMessage lastTime */
                lastTime?: (number|Long|null);

                /** FolderDeleteAckMessage path */
                path?: (string|null);

                /** FolderDeleteAckMessage pathHash */
                pathHash?: (string|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderDeleteAckMessage. */
            type $Shape = proto.v1.FolderDeleteAckMessage.$Properties;
        }

        /**
         * Properties of a NoteSyncPageMessage.
         * @deprecated Use proto.v1.NoteSyncPageMessage.$Properties instead.
         */
        type INoteSyncPageMessage = proto.v1.NoteSyncPageMessage.$Properties;

        /** Represents a NoteSyncPageMessage. */
        class NoteSyncPageMessage {

            /**
             * Constructs a new NoteSyncPageMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncPageMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncPageMessage pageIndex. */
            pageIndex: number;

            /** NoteSyncPageMessage pageSize. */
            pageSize: number;

            /** NoteSyncPageMessage totalCount. */
            totalCount: number;

            /** NoteSyncPageMessage isLast. */
            isLast: boolean;

            /**
             * Creates a new NoteSyncPageMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncPageMessage instance
             */
            static create(properties: proto.v1.NoteSyncPageMessage.$Shape): proto.v1.NoteSyncPageMessage & proto.v1.NoteSyncPageMessage.$Shape;
            static create(properties?: proto.v1.NoteSyncPageMessage.$Properties): proto.v1.NoteSyncPageMessage;

            /**
             * Encodes the specified NoteSyncPageMessage message. Does not implicitly {@link proto.v1.NoteSyncPageMessage.verify|verify} messages.
             * @param message NoteSyncPageMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncPageMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncPageMessage message, length delimited. Does not implicitly {@link proto.v1.NoteSyncPageMessage.verify|verify} messages.
             * @param message NoteSyncPageMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncPageMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncPageMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncPageMessage & proto.v1.NoteSyncPageMessage.$Shape} NoteSyncPageMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncPageMessage & proto.v1.NoteSyncPageMessage.$Shape;

            /**
             * Decodes a NoteSyncPageMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncPageMessage & proto.v1.NoteSyncPageMessage.$Shape} NoteSyncPageMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncPageMessage & proto.v1.NoteSyncPageMessage.$Shape;

            /**
             * Verifies a NoteSyncPageMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncPageMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncPageMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncPageMessage;

            /**
             * Creates a plain object from a NoteSyncPageMessage message. Also converts values to other types if specified.
             * @param message NoteSyncPageMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncPageMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncPageMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncPageMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncPageMessage {

            /** Properties of a NoteSyncPageMessage. */
            interface $Properties {

                /** NoteSyncPageMessage pageIndex */
                pageIndex?: (number|null);

                /** NoteSyncPageMessage pageSize */
                pageSize?: (number|null);

                /** NoteSyncPageMessage totalCount */
                totalCount?: (number|null);

                /** NoteSyncPageMessage isLast */
                isLast?: (boolean|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncPageMessage. */
            type $Shape = proto.v1.NoteSyncPageMessage.$Properties;
        }

        /**
         * Properties of a NoteSyncPageAckRequest.
         * @deprecated Use proto.v1.NoteSyncPageAckRequest.$Properties instead.
         */
        type INoteSyncPageAckRequest = proto.v1.NoteSyncPageAckRequest.$Properties;

        /** Represents a NoteSyncPageAckRequest. */
        class NoteSyncPageAckRequest {

            /**
             * Constructs a new NoteSyncPageAckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.NoteSyncPageAckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** NoteSyncPageAckRequest context. */
            context: string;

            /** NoteSyncPageAckRequest vault. */
            vault: string;

            /** NoteSyncPageAckRequest pageIndex. */
            pageIndex: number;

            /**
             * Creates a new NoteSyncPageAckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NoteSyncPageAckRequest instance
             */
            static create(properties: proto.v1.NoteSyncPageAckRequest.$Shape): proto.v1.NoteSyncPageAckRequest & proto.v1.NoteSyncPageAckRequest.$Shape;
            static create(properties?: proto.v1.NoteSyncPageAckRequest.$Properties): proto.v1.NoteSyncPageAckRequest;

            /**
             * Encodes the specified NoteSyncPageAckRequest message. Does not implicitly {@link proto.v1.NoteSyncPageAckRequest.verify|verify} messages.
             * @param message NoteSyncPageAckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.NoteSyncPageAckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NoteSyncPageAckRequest message, length delimited. Does not implicitly {@link proto.v1.NoteSyncPageAckRequest.verify|verify} messages.
             * @param message NoteSyncPageAckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.NoteSyncPageAckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NoteSyncPageAckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.NoteSyncPageAckRequest & proto.v1.NoteSyncPageAckRequest.$Shape} NoteSyncPageAckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.NoteSyncPageAckRequest & proto.v1.NoteSyncPageAckRequest.$Shape;

            /**
             * Decodes a NoteSyncPageAckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.NoteSyncPageAckRequest & proto.v1.NoteSyncPageAckRequest.$Shape} NoteSyncPageAckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.NoteSyncPageAckRequest & proto.v1.NoteSyncPageAckRequest.$Shape;

            /**
             * Verifies a NoteSyncPageAckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a NoteSyncPageAckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NoteSyncPageAckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.NoteSyncPageAckRequest;

            /**
             * Creates a plain object from a NoteSyncPageAckRequest message. Also converts values to other types if specified.
             * @param message NoteSyncPageAckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.NoteSyncPageAckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this NoteSyncPageAckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for NoteSyncPageAckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace NoteSyncPageAckRequest {

            /** Properties of a NoteSyncPageAckRequest. */
            interface $Properties {

                /** NoteSyncPageAckRequest context */
                context?: (string|null);

                /** NoteSyncPageAckRequest vault */
                vault?: (string|null);

                /** NoteSyncPageAckRequest pageIndex */
                pageIndex?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a NoteSyncPageAckRequest. */
            type $Shape = proto.v1.NoteSyncPageAckRequest.$Properties;
        }

        /**
         * Properties of a FileSyncPageMessage.
         * @deprecated Use proto.v1.FileSyncPageMessage.$Properties instead.
         */
        type IFileSyncPageMessage = proto.v1.FileSyncPageMessage.$Properties;

        /** Represents a FileSyncPageMessage. */
        class FileSyncPageMessage {

            /**
             * Constructs a new FileSyncPageMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncPageMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncPageMessage pageIndex. */
            pageIndex: number;

            /** FileSyncPageMessage pageSize. */
            pageSize: number;

            /** FileSyncPageMessage totalCount. */
            totalCount: number;

            /** FileSyncPageMessage isLast. */
            isLast: boolean;

            /**
             * Creates a new FileSyncPageMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncPageMessage instance
             */
            static create(properties: proto.v1.FileSyncPageMessage.$Shape): proto.v1.FileSyncPageMessage & proto.v1.FileSyncPageMessage.$Shape;
            static create(properties?: proto.v1.FileSyncPageMessage.$Properties): proto.v1.FileSyncPageMessage;

            /**
             * Encodes the specified FileSyncPageMessage message. Does not implicitly {@link proto.v1.FileSyncPageMessage.verify|verify} messages.
             * @param message FileSyncPageMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncPageMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncPageMessage message, length delimited. Does not implicitly {@link proto.v1.FileSyncPageMessage.verify|verify} messages.
             * @param message FileSyncPageMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncPageMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncPageMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncPageMessage & proto.v1.FileSyncPageMessage.$Shape} FileSyncPageMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncPageMessage & proto.v1.FileSyncPageMessage.$Shape;

            /**
             * Decodes a FileSyncPageMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncPageMessage & proto.v1.FileSyncPageMessage.$Shape} FileSyncPageMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncPageMessage & proto.v1.FileSyncPageMessage.$Shape;

            /**
             * Verifies a FileSyncPageMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncPageMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncPageMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncPageMessage;

            /**
             * Creates a plain object from a FileSyncPageMessage message. Also converts values to other types if specified.
             * @param message FileSyncPageMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncPageMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncPageMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncPageMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncPageMessage {

            /** Properties of a FileSyncPageMessage. */
            interface $Properties {

                /** FileSyncPageMessage pageIndex */
                pageIndex?: (number|null);

                /** FileSyncPageMessage pageSize */
                pageSize?: (number|null);

                /** FileSyncPageMessage totalCount */
                totalCount?: (number|null);

                /** FileSyncPageMessage isLast */
                isLast?: (boolean|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncPageMessage. */
            type $Shape = proto.v1.FileSyncPageMessage.$Properties;
        }

        /**
         * Properties of a FileSyncPageAckRequest.
         * @deprecated Use proto.v1.FileSyncPageAckRequest.$Properties instead.
         */
        type IFileSyncPageAckRequest = proto.v1.FileSyncPageAckRequest.$Properties;

        /** Represents a FileSyncPageAckRequest. */
        class FileSyncPageAckRequest {

            /**
             * Constructs a new FileSyncPageAckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FileSyncPageAckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FileSyncPageAckRequest context. */
            context: string;

            /** FileSyncPageAckRequest vault. */
            vault: string;

            /** FileSyncPageAckRequest pageIndex. */
            pageIndex: number;

            /**
             * Creates a new FileSyncPageAckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileSyncPageAckRequest instance
             */
            static create(properties: proto.v1.FileSyncPageAckRequest.$Shape): proto.v1.FileSyncPageAckRequest & proto.v1.FileSyncPageAckRequest.$Shape;
            static create(properties?: proto.v1.FileSyncPageAckRequest.$Properties): proto.v1.FileSyncPageAckRequest;

            /**
             * Encodes the specified FileSyncPageAckRequest message. Does not implicitly {@link proto.v1.FileSyncPageAckRequest.verify|verify} messages.
             * @param message FileSyncPageAckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FileSyncPageAckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileSyncPageAckRequest message, length delimited. Does not implicitly {@link proto.v1.FileSyncPageAckRequest.verify|verify} messages.
             * @param message FileSyncPageAckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FileSyncPageAckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileSyncPageAckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FileSyncPageAckRequest & proto.v1.FileSyncPageAckRequest.$Shape} FileSyncPageAckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FileSyncPageAckRequest & proto.v1.FileSyncPageAckRequest.$Shape;

            /**
             * Decodes a FileSyncPageAckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FileSyncPageAckRequest & proto.v1.FileSyncPageAckRequest.$Shape} FileSyncPageAckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FileSyncPageAckRequest & proto.v1.FileSyncPageAckRequest.$Shape;

            /**
             * Verifies a FileSyncPageAckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FileSyncPageAckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileSyncPageAckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FileSyncPageAckRequest;

            /**
             * Creates a plain object from a FileSyncPageAckRequest message. Also converts values to other types if specified.
             * @param message FileSyncPageAckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FileSyncPageAckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FileSyncPageAckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FileSyncPageAckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FileSyncPageAckRequest {

            /** Properties of a FileSyncPageAckRequest. */
            interface $Properties {

                /** FileSyncPageAckRequest context */
                context?: (string|null);

                /** FileSyncPageAckRequest vault */
                vault?: (string|null);

                /** FileSyncPageAckRequest pageIndex */
                pageIndex?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FileSyncPageAckRequest. */
            type $Shape = proto.v1.FileSyncPageAckRequest.$Properties;
        }

        /**
         * Properties of a SettingSyncPageMessage.
         * @deprecated Use proto.v1.SettingSyncPageMessage.$Properties instead.
         */
        type ISettingSyncPageMessage = proto.v1.SettingSyncPageMessage.$Properties;

        /** Represents a SettingSyncPageMessage. */
        class SettingSyncPageMessage {

            /**
             * Constructs a new SettingSyncPageMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncPageMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncPageMessage pageIndex. */
            pageIndex: number;

            /** SettingSyncPageMessage pageSize. */
            pageSize: number;

            /** SettingSyncPageMessage totalCount. */
            totalCount: number;

            /** SettingSyncPageMessage isLast. */
            isLast: boolean;

            /**
             * Creates a new SettingSyncPageMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncPageMessage instance
             */
            static create(properties: proto.v1.SettingSyncPageMessage.$Shape): proto.v1.SettingSyncPageMessage & proto.v1.SettingSyncPageMessage.$Shape;
            static create(properties?: proto.v1.SettingSyncPageMessage.$Properties): proto.v1.SettingSyncPageMessage;

            /**
             * Encodes the specified SettingSyncPageMessage message. Does not implicitly {@link proto.v1.SettingSyncPageMessage.verify|verify} messages.
             * @param message SettingSyncPageMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncPageMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncPageMessage message, length delimited. Does not implicitly {@link proto.v1.SettingSyncPageMessage.verify|verify} messages.
             * @param message SettingSyncPageMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncPageMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncPageMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncPageMessage & proto.v1.SettingSyncPageMessage.$Shape} SettingSyncPageMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncPageMessage & proto.v1.SettingSyncPageMessage.$Shape;

            /**
             * Decodes a SettingSyncPageMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncPageMessage & proto.v1.SettingSyncPageMessage.$Shape} SettingSyncPageMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncPageMessage & proto.v1.SettingSyncPageMessage.$Shape;

            /**
             * Verifies a SettingSyncPageMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncPageMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncPageMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncPageMessage;

            /**
             * Creates a plain object from a SettingSyncPageMessage message. Also converts values to other types if specified.
             * @param message SettingSyncPageMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncPageMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncPageMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncPageMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncPageMessage {

            /** Properties of a SettingSyncPageMessage. */
            interface $Properties {

                /** SettingSyncPageMessage pageIndex */
                pageIndex?: (number|null);

                /** SettingSyncPageMessage pageSize */
                pageSize?: (number|null);

                /** SettingSyncPageMessage totalCount */
                totalCount?: (number|null);

                /** SettingSyncPageMessage isLast */
                isLast?: (boolean|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncPageMessage. */
            type $Shape = proto.v1.SettingSyncPageMessage.$Properties;
        }

        /**
         * Properties of a SettingSyncPageAckRequest.
         * @deprecated Use proto.v1.SettingSyncPageAckRequest.$Properties instead.
         */
        type ISettingSyncPageAckRequest = proto.v1.SettingSyncPageAckRequest.$Properties;

        /** Represents a SettingSyncPageAckRequest. */
        class SettingSyncPageAckRequest {

            /**
             * Constructs a new SettingSyncPageAckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.SettingSyncPageAckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** SettingSyncPageAckRequest context. */
            context: string;

            /** SettingSyncPageAckRequest vault. */
            vault: string;

            /** SettingSyncPageAckRequest pageIndex. */
            pageIndex: number;

            /**
             * Creates a new SettingSyncPageAckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SettingSyncPageAckRequest instance
             */
            static create(properties: proto.v1.SettingSyncPageAckRequest.$Shape): proto.v1.SettingSyncPageAckRequest & proto.v1.SettingSyncPageAckRequest.$Shape;
            static create(properties?: proto.v1.SettingSyncPageAckRequest.$Properties): proto.v1.SettingSyncPageAckRequest;

            /**
             * Encodes the specified SettingSyncPageAckRequest message. Does not implicitly {@link proto.v1.SettingSyncPageAckRequest.verify|verify} messages.
             * @param message SettingSyncPageAckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.SettingSyncPageAckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SettingSyncPageAckRequest message, length delimited. Does not implicitly {@link proto.v1.SettingSyncPageAckRequest.verify|verify} messages.
             * @param message SettingSyncPageAckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.SettingSyncPageAckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SettingSyncPageAckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.SettingSyncPageAckRequest & proto.v1.SettingSyncPageAckRequest.$Shape} SettingSyncPageAckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.SettingSyncPageAckRequest & proto.v1.SettingSyncPageAckRequest.$Shape;

            /**
             * Decodes a SettingSyncPageAckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.SettingSyncPageAckRequest & proto.v1.SettingSyncPageAckRequest.$Shape} SettingSyncPageAckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.SettingSyncPageAckRequest & proto.v1.SettingSyncPageAckRequest.$Shape;

            /**
             * Verifies a SettingSyncPageAckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a SettingSyncPageAckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SettingSyncPageAckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.SettingSyncPageAckRequest;

            /**
             * Creates a plain object from a SettingSyncPageAckRequest message. Also converts values to other types if specified.
             * @param message SettingSyncPageAckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.SettingSyncPageAckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this SettingSyncPageAckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for SettingSyncPageAckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace SettingSyncPageAckRequest {

            /** Properties of a SettingSyncPageAckRequest. */
            interface $Properties {

                /** SettingSyncPageAckRequest context */
                context?: (string|null);

                /** SettingSyncPageAckRequest vault */
                vault?: (string|null);

                /** SettingSyncPageAckRequest pageIndex */
                pageIndex?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a SettingSyncPageAckRequest. */
            type $Shape = proto.v1.SettingSyncPageAckRequest.$Properties;
        }

        /**
         * Properties of a FolderSyncPageMessage.
         * @deprecated Use proto.v1.FolderSyncPageMessage.$Properties instead.
         */
        type IFolderSyncPageMessage = proto.v1.FolderSyncPageMessage.$Properties;

        /** Represents a FolderSyncPageMessage. */
        class FolderSyncPageMessage {

            /**
             * Constructs a new FolderSyncPageMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderSyncPageMessage.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderSyncPageMessage pageIndex. */
            pageIndex: number;

            /** FolderSyncPageMessage pageSize. */
            pageSize: number;

            /** FolderSyncPageMessage totalCount. */
            totalCount: number;

            /** FolderSyncPageMessage isLast. */
            isLast: boolean;

            /**
             * Creates a new FolderSyncPageMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderSyncPageMessage instance
             */
            static create(properties: proto.v1.FolderSyncPageMessage.$Shape): proto.v1.FolderSyncPageMessage & proto.v1.FolderSyncPageMessage.$Shape;
            static create(properties?: proto.v1.FolderSyncPageMessage.$Properties): proto.v1.FolderSyncPageMessage;

            /**
             * Encodes the specified FolderSyncPageMessage message. Does not implicitly {@link proto.v1.FolderSyncPageMessage.verify|verify} messages.
             * @param message FolderSyncPageMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderSyncPageMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderSyncPageMessage message, length delimited. Does not implicitly {@link proto.v1.FolderSyncPageMessage.verify|verify} messages.
             * @param message FolderSyncPageMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderSyncPageMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderSyncPageMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderSyncPageMessage & proto.v1.FolderSyncPageMessage.$Shape} FolderSyncPageMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderSyncPageMessage & proto.v1.FolderSyncPageMessage.$Shape;

            /**
             * Decodes a FolderSyncPageMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderSyncPageMessage & proto.v1.FolderSyncPageMessage.$Shape} FolderSyncPageMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderSyncPageMessage & proto.v1.FolderSyncPageMessage.$Shape;

            /**
             * Verifies a FolderSyncPageMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderSyncPageMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderSyncPageMessage
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderSyncPageMessage;

            /**
             * Creates a plain object from a FolderSyncPageMessage message. Also converts values to other types if specified.
             * @param message FolderSyncPageMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderSyncPageMessage, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderSyncPageMessage to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderSyncPageMessage
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderSyncPageMessage {

            /** Properties of a FolderSyncPageMessage. */
            interface $Properties {

                /** FolderSyncPageMessage pageIndex */
                pageIndex?: (number|null);

                /** FolderSyncPageMessage pageSize */
                pageSize?: (number|null);

                /** FolderSyncPageMessage totalCount */
                totalCount?: (number|null);

                /** FolderSyncPageMessage isLast */
                isLast?: (boolean|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderSyncPageMessage. */
            type $Shape = proto.v1.FolderSyncPageMessage.$Properties;
        }

        /**
         * Properties of a FolderSyncPageAckRequest.
         * @deprecated Use proto.v1.FolderSyncPageAckRequest.$Properties instead.
         */
        type IFolderSyncPageAckRequest = proto.v1.FolderSyncPageAckRequest.$Properties;

        /** Represents a FolderSyncPageAckRequest. */
        class FolderSyncPageAckRequest {

            /**
             * Constructs a new FolderSyncPageAckRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: proto.v1.FolderSyncPageAckRequest.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** FolderSyncPageAckRequest context. */
            context: string;

            /** FolderSyncPageAckRequest vault. */
            vault: string;

            /** FolderSyncPageAckRequest pageIndex. */
            pageIndex: number;

            /**
             * Creates a new FolderSyncPageAckRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FolderSyncPageAckRequest instance
             */
            static create(properties: proto.v1.FolderSyncPageAckRequest.$Shape): proto.v1.FolderSyncPageAckRequest & proto.v1.FolderSyncPageAckRequest.$Shape;
            static create(properties?: proto.v1.FolderSyncPageAckRequest.$Properties): proto.v1.FolderSyncPageAckRequest;

            /**
             * Encodes the specified FolderSyncPageAckRequest message. Does not implicitly {@link proto.v1.FolderSyncPageAckRequest.verify|verify} messages.
             * @param message FolderSyncPageAckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: proto.v1.FolderSyncPageAckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FolderSyncPageAckRequest message, length delimited. Does not implicitly {@link proto.v1.FolderSyncPageAckRequest.verify|verify} messages.
             * @param message FolderSyncPageAckRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: proto.v1.FolderSyncPageAckRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FolderSyncPageAckRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {proto.v1.FolderSyncPageAckRequest & proto.v1.FolderSyncPageAckRequest.$Shape} FolderSyncPageAckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): proto.v1.FolderSyncPageAckRequest & proto.v1.FolderSyncPageAckRequest.$Shape;

            /**
             * Decodes a FolderSyncPageAckRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {proto.v1.FolderSyncPageAckRequest & proto.v1.FolderSyncPageAckRequest.$Shape} FolderSyncPageAckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): proto.v1.FolderSyncPageAckRequest & proto.v1.FolderSyncPageAckRequest.$Shape;

            /**
             * Verifies a FolderSyncPageAckRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: unknown }): (string|null);

            /**
             * Creates a FolderSyncPageAckRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FolderSyncPageAckRequest
             */
            static fromObject(object: { [k: string]: unknown }): proto.v1.FolderSyncPageAckRequest;

            /**
             * Creates a plain object from a FolderSyncPageAckRequest message. Also converts values to other types if specified.
             * @param message FolderSyncPageAckRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: proto.v1.FolderSyncPageAckRequest, options?: $protobuf.IConversionOptions): { [k: string]: unknown };

            /**
             * Converts this FolderSyncPageAckRequest to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: unknown };

            /**
             * Gets the type url for FolderSyncPageAckRequest
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace FolderSyncPageAckRequest {

            /** Properties of a FolderSyncPageAckRequest. */
            interface $Properties {

                /** FolderSyncPageAckRequest context */
                context?: (string|null);

                /** FolderSyncPageAckRequest vault */
                vault?: (string|null);

                /** FolderSyncPageAckRequest pageIndex */
                pageIndex?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a FolderSyncPageAckRequest. */
            type $Shape = proto.v1.FolderSyncPageAckRequest.$Properties;
        }
    }
}
