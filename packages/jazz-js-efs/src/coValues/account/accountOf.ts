import {
    AgentSecret,
    CoID,
    CoValueCore,
    LocalNode,
    Peer,
    RawAccount,
    RawControlledAccount,
    SessionID,
} from "cojson";
import {
    ID,
    tagSym,
    rawSym,
    schemaTagSym,
    AnyCoValueSchema,
    inspect,
} from "../../coValueInterfaces.js";
import { CoMapOf } from "../coMap/coMapOf.js";
import {
    Account,
    AccountSchema,
    AnyProfileSchema,
    ControlledAccount,
    controlledAccountSym,
} from "./account.js";
import * as S from "@effect/schema/Schema";
import { AccountMigration } from "./migration.js";
import { toJSON } from "effect/Inspectable";
import { Schema } from "@effect/schema";
import { Group } from "../group/group.js";
import { SharedCoValueConstructor } from "../construction.js";

export function AccountOf<
    P extends AnyProfileSchema,
    R extends AnyCoValueSchema | S.Schema<null>,
>(fields: { profile: P; root: R }): AccountSchema<Account<P, R>, P, R> {
    const struct = S.struct(fields) as unknown as Schema.Schema<
        AccountOfProfileAndRoot,
        Schema.FromStruct<{
            profile: P;
            root: R;
        }>,
        never
    >;

    class AccountOfProfileAndRoot
        extends SharedCoValueConstructor
        implements Account<P, R>
    {
        static ast = struct.ast;
        static [S.TypeId] = struct[S.TypeId];
        static pipe = struct.pipe;
        static [schemaTagSym] = "Account" as const;
        static [controlledAccountSym]: AccountOfProfileAndRoot &
            ControlledAccount<P, R>;

        [tagSym] = "Account" as const;
        [rawSym]: RawAccount | RawControlledAccount;
        id: ID<this>;
        isMe: boolean;
        meta: {
            loadedAs: ControlledAccount;
            core: CoValueCore;
        };

        get profile(): S.Schema.To<P> {
            const id = this[rawSym].get("profile");

            throw new Error("Not implemented");
        }

        get root(): S.Schema.To<R> {
            const id = this[rawSym].get("root");

            throw new Error("Not implemented");
        }

        constructor(
            init: Record<string, never>,
            options: { owner: ControlledAccount | Group }
        );
        constructor(
            init: undefined,
            options: { fromRaw: RawAccount | RawControlledAccount }
        );
        constructor(
            init: undefined | Record<string, never>,
            options:
                | { fromRaw: RawAccount | RawControlledAccount }
                | { owner: ControlledAccount | Group }
        ) {
            super();
            if (!("fromRaw" in options)) {
                throw new Error(
                    "Can only construct account from raw or with .create()"
                );
            }
            this[rawSym] = options.fromRaw;
            this.id = options.fromRaw.id as unknown as ID<this>;
            this.isMe =
                options.fromRaw.id == options.fromRaw.core.node.account.id;
            this.meta = {
                loadedAs:
                    options.fromRaw.id === options.fromRaw.core.node.account.id
                        ? (this as ControlledAccount)
                        : controlledAccountFromNode(options.fromRaw.core.node),
                core: options.fromRaw.core,
            };
        }

        static async create(options: {
            name: string;
            migration?: AccountMigration<AccountSchema<Account<P, R>, P, R>>;
            initialAgentSecret?: AgentSecret;
            peersToLoadFrom?: Peer[];
        }): Promise<AccountOfProfileAndRoot & ControlledAccount<P, R>> {
            const { node } = await LocalNode.withNewlyCreatedAccount({
                ...options,
                migration:
                    options.migration &&
                    (async (rawAccount) => {
                        const account = new AccountOfProfileAndRoot(undefined, {
                            fromRaw: rawAccount,
                        }) as AccountOfProfileAndRoot & ControlledAccount<P, R>;

                        await options.migration!(account);
                    }),
            });

            return new AccountOfProfileAndRoot(undefined, {
                fromRaw: node.account as RawControlledAccount,
            }) as AccountOfProfileAndRoot & ControlledAccount<P, R>;
        }

        static async become(options: {
            accountID: ID<Account<P, R>>;
            accountSecret: AgentSecret;
            sessionID: SessionID;
            peersToLoadFrom: Peer[];
            migration?: AccountMigration<AccountSchema<Account<P, R>, P, R>>;
        }): Promise<AccountOfProfileAndRoot & ControlledAccount<P, R>> {
            const node = await LocalNode.withLoadedAccount({
                accountID: options.accountID as unknown as CoID<RawAccount>,
                accountSecret: options.accountSecret,
                sessionID: options.sessionID,
                peersToLoadFrom: options.peersToLoadFrom,
                migration:
                    options.migration &&
                    (async (rawAccount) => {
                        const account = new AccountOfProfileAndRoot(undefined, {
                            fromRaw: rawAccount,
                        }) as AccountOfProfileAndRoot & ControlledAccount<P, R>;

                        await options.migration!(account);
                    }),
            });

            return new AccountOfProfileAndRoot(undefined, {
                fromRaw: node.account as RawControlledAccount,
            }) as AccountOfProfileAndRoot & ControlledAccount<P, R>;
        }

        toJSON() {
            return {
                id: this.id,
                profile: toJSON(this.profile),
                root: toJSON(this.root),
            };
        }

        [inspect]() {
            return this.toJSON();
        }
    }

    return AccountOfProfileAndRoot as AccountSchema<Account<P, R>, P, R>;
}

export class BaseProfile extends CoMapOf({
    name: S.string,
}).as<BaseProfile>() {}

export class SimpleAccount extends AccountOf<
    typeof BaseProfile,
    Schema.Schema<null>
>({
    profile: BaseProfile,
    root: S.null,
}) {}

export function controlledAccountFromNode(node: LocalNode) {
    if (!(node.account instanceof RawControlledAccount)) {
        throw new Error("Expected a controlled account");
    }
    return new SimpleAccount(undefined, {
        fromRaw: node.account,
    }) as SimpleAccount & ControlledAccount;
}