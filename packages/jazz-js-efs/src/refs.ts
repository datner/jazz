import { Effect } from "effect";
import { CoValue, ID, rawSym } from "./coValueInterfaces.js";
import { ControlledAccount } from "./coValues/account/account.js";
import { CoID, RawCoValue } from "cojson";
import { UnavailableError } from "./errors.js";
import { getCoValueConstructorInProperty } from "./coValues/resolution.js";
import { PropDef } from "./schemaHelpers.js";

export class ValueRef<V extends CoValue> {
    private cachedValue: V | undefined;

    constructor(
        readonly id: ID<V>,
        readonly controlledAccount: ControlledAccount,
        readonly propDef: PropDef<any>
    ) {}

    get value() {
        if (this.cachedValue) return this.cachedValue;
        // TODO: cache it for object identity!!!
        const raw = this.controlledAccount[rawSym].core.node.getLoaded(
            this.id as unknown as CoID<RawCoValue>
        );
        if (raw) {
            const Constructor = getCoValueConstructorInProperty(
                this.propDef,
                raw
            );
            if (!Constructor) {
                throw new Error(
                    "Couldn't extract CoValue constructor from property definition"
                );
            }
            const value = new Constructor(undefined, { fromRaw: raw }) as V;
            this.cachedValue = value;
            return value;
        }
    }

    loadEf() {
        return Effect.async<V, UnavailableError>((fulfill) => {
            this.load()
                .then((value) => {
                    if (value === "unavailable") {
                        fulfill(Effect.fail<UnavailableError>("unavailable"));
                    } else {
                        fulfill(Effect.succeed(value));
                    }
                })
                .catch((e) => {
                    fulfill(Effect.die(e));
                });
        });
    }

    async load(): Promise<V | "unavailable"> {
        const raw = await this.controlledAccount[rawSym].core.node.load(
            this.id as unknown as CoID<RawCoValue>
        );
        if (raw === "unavailable") {
            return "unavailable";
        } else {
            return new ValueRef(this.id, this.controlledAccount, this.propDef)
                .value!;
        }
    }
}

export function makeRefs<F extends { [key: string | number]: CoValue }>(
    getIdForKey: <K extends keyof F>(key: K) => F[K]["id"] | undefined,
    getKeysWithIds: () => (keyof F)[],
    controlledAccount: ControlledAccount,
    propDefForKey: <K extends keyof F>(key: K) => PropDef<F[K]>
): { [K in keyof F]: ValueRef<F[K]> } {
    const refs = {} as { [K in keyof F]: ValueRef<F[K]> };
    return new Proxy(refs, {
        get(target, key) {
            if (typeof key === "symbol") return undefined;
            const id = getIdForKey(key as keyof F);
            if (!id) return undefined;
            return new ValueRef(
                id as ID<F[typeof key]>,
                controlledAccount,
                propDefForKey(key as keyof F)
            );
        },
        ownKeys() {
            return getKeysWithIds().map((key) => key.toString());
        },
    });
}