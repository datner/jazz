import {
    AnyCoValueSchema,
    CoValue,
    CoValueSchema,
} from "../../coValueInterfaces.js";
import { CoValueCore, JsonValue, RawCoMap } from "cojson";
import { ValueRef } from "../../refs.js";
import {
    PropertySignatureWithInput,
    SchemaWithOutput,
} from "../../schemaHelpers.js";
import { ControlledAccount } from "../account/account.js";
import { Schema } from "@effect/schema";
import { Simplify } from "effect/Types";

export interface CoMapBase<
    Fields extends CoMapFields,
    IdxKey extends Schema.Schema<string> = never,
    IdxVal extends CoMapFieldValue = never,
> extends CoValue<"CoMap", RawCoMap> {
    meta: CoMapMeta<Fields, IdxKey, IdxVal>;
}

export type CoMap<
    Fields extends CoMapFields,
    IdxKey extends Schema.Schema<string> = never,
    IdxVal extends CoMapFieldValue = never,
> = {
    [Key in keyof Fields]: Schema.Schema.To<Fields[Key]>;
} & {
    [Key in Schema.Schema.To<IdxKey>]: Schema.Schema.To<IdxVal>;
} & CoMapBase<Fields, IdxKey, IdxVal>;

export interface AnyCoMapSchema<
    Fields extends CoMapFields,
    IdxKey extends Schema.Schema<string> = Schema.Schema<string>,
    IdxVal extends CoMapFieldValue = CoMapFieldValue,
> extends AnyCoValueSchema<
        "CoMap",
        CoMap<Fields, IdxKey, IdxVal>,
        Schema.FromStruct<Fields>,
        CoMapInit<Fields>
    > {}

export interface CoMapSchema<
    Self,
    Fields extends CoMapFields,
    IdxKey extends Schema.Schema<string> = Schema.Schema<string>,
    IdxVal extends CoMapFieldValue = CoMapFieldValue,
> extends CoValueSchema<
        Self,
        "CoMap",
        CoMap<Fields, IdxKey, IdxVal>,
        Schema.FromStruct<Fields>,
        Simplify<CoMapInit<Fields, IdxKey, IdxVal>>
    > {}

export type CoMapFieldValue =
    | AnyCoValueSchema
    | SchemaWithOutput<JsonValue>
    | PropertySignatureWithInput<CoValue | JsonValue>;

export type CoMapFields = {
    [key: string]: CoMapFieldValue;
};

export type CoMapInit<
    Fields extends CoMapFields,
    IdxKey extends Schema.Schema<string> = never,
    IdxVal extends CoMapFieldValue = never,
> = Schema.ToStruct<Fields> & {
    [Key in Schema.Schema.To<IdxKey>]: Schema.Schema.To<IdxVal>;
};

export type CoMapMeta<
    Fields extends CoMapFields,
    IdxKey extends Schema.Schema<string> = never,
    IdxVal extends CoMapFieldValue = never,
> = {
    readonly loadedAs: ControlledAccount;
    readonly core: CoValueCore;
    readonly refs: {
        [Key in keyof Fields]: Fields[Key] extends AnyCoValueSchema<
            infer _,
            infer Value
        >
            ? ValueRef<Value>
            : never;
    } & {
        [Key in Schema.Schema.To<IdxKey>]: Schema.Schema.To<IdxVal> extends AnyCoValueSchema<
            infer _,
            infer Value
        >
            ? ValueRef<Value>
            : never;
    };
};