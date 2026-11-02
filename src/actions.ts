import {
  Address,
  beginCell,
  Cell,
  MessageRelaxed,
  SendMode,
  storeMessageRelaxed,
} from "@ton/core";

export class ActionSendMsg {
  static readonly tag = 0x0ec3c86d;
  readonly tag = ActionSendMsg.tag;
  constructor(
    public readonly mode: SendMode,
    public readonly outMsg: MessageRelaxed,
  ) {}
  serialize(): Cell {
    return beginCell()
      .storeUint(this.tag, 32)
      .storeUint(this.mode | SendMode.IGNORE_ERRORS, 8)
      .storeRef(beginCell().store(storeMessageRelaxed(this.outMsg)).endCell())
      .endCell();
  }
}

export class ActionAddExtension {
  static readonly tag = 0x02;
  readonly tag = ActionAddExtension.tag;
  constructor(public readonly address: Address) {}
  serialize(): Cell {
    return beginCell().storeUint(this.tag, 8).storeAddress(this.address).endCell();
  }
}

export class ActionRemoveExtension {
  static readonly tag = 0x03;
  readonly tag = ActionRemoveExtension.tag;
  constructor(public readonly address: Address) {}
  serialize(): Cell {
    return beginCell().storeUint(this.tag, 8).storeAddress(this.address).endCell();
  }
}

export type OutAction = ActionSendMsg;
export type ExtendedAction = ActionAddExtension | ActionRemoveExtension;

export function isExtendedAction(
  action: OutAction | ExtendedAction,
): action is ExtendedAction {
  return (
    action.tag === ActionAddExtension.tag ||
    action.tag === ActionRemoveExtension.tag
  );
}

function packActionsListOut(actions: OutAction[]): Cell {
  if (actions.length === 0) return beginCell().endCell();
  const [action, ...rest] = actions;
  return beginCell()
    .storeRef(packActionsListOut(rest))
    .storeSlice(action.serialize().beginParse())
    .endCell();
}

function packExtendedActions(extendedActions: ExtendedAction[]): Cell {
  const first = extendedActions[0];
  const rest = extendedActions.slice(1);
  let builder = beginCell().storeSlice(first.serialize().beginParse());
  if (rest.length > 0) {
    builder = builder.storeRef(packExtendedActions(rest));
  }
  return builder.endCell();
}

/** Inner request body for extension auth (after opcode + query_id). */
export function packActionsList(actions: (OutAction | ExtendedAction)[]): Cell {
  const extendedActions: ExtendedAction[] = [];
  const outActions: OutAction[] = [];
  for (const action of actions) {
    if (isExtendedAction(action)) extendedActions.push(action);
    else outActions.push(action);
  }

  let builder = beginCell();
  if (outActions.length === 0) {
    builder = builder.storeUint(0, 1);
  } else {
    builder = builder.storeMaybeRef(
      packActionsListOut(outActions.slice().reverse()),
    );
  }
  if (extendedActions.length === 0) {
    builder = builder.storeUint(0, 1);
  } else {
    const first = extendedActions[0];
    const rest = extendedActions.slice(1);
    builder = builder
      .storeUint(1, 1)
      .storeSlice(first.serialize().beginParse());
    if (rest.length > 0) {
      builder = builder.storeRef(packExtendedActions(rest));
    }
  }
  return builder.endCell();
}

export const AUTH_EXTENSION_OPCODE = 0x6578746e;
