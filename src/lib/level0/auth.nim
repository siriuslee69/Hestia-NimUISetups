# ==========================================================
# | login auth helpers                                      |
# |---------------------------------------------------------|
# | Shared static credential checks for prototype frontends |
# ==========================================================

const
  DefaultLoginName* = "test"
  DefaultLoginPassword* = "test"

proc isValidLogin*(n, p: string): bool =
  ## n: login name submitted by user.
  ## p: password submitted by user.
  result = n == DefaultLoginName and p == DefaultLoginPassword
