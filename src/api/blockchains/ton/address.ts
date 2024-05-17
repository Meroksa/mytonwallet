import { Address } from '@ton/core';

import type { ApiNetwork } from '../../types';

import dns from '../../../util/dns';
import { DnsCategory, dnsResolve } from './util/dns';
import { getTonClient, toBase64Address } from './util/tonCore';
import { getKnownAddressInfo } from '../../common/addresses';

const TON_DNS_COLLECTION = 'EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz';
const VIP_DNS_COLLECTION = 'EQBWG4EBbPDv4Xj7xlPwzxd7hSyHMzwwLB5O6rY-0BBeaixS';

export async function resolveAddress(network: ApiNetwork, address: string): Promise<{
  address: string;
  name?: string;
  isMemoRequired?: boolean;
  isScam?: boolean;
} | undefined> {
  const isDomain = dns.isDnsDomain(address);
  let domain: string | undefined;

  if (isDomain) {
    const resolvedAddress = await resolveAddressByDomain(network, address);
    if (!resolvedAddress) {
      return undefined;
    }

    domain = address;
    address = resolvedAddress;
  }

  const normalizedAddress = normalizeAddress(address);
  const known = getKnownAddressInfo(normalizedAddress);

  if (known) {
    return {
      address,
      ...known,
      name: domain ?? known.name,
    };
  }

  return { address, name: domain };
}

async function resolveAddressByDomain(network: ApiNetwork, domain: string) {
  try {
    let base: string;
    let collection: string;
    if (dns.isVipDnsDomain(domain)) {
      base = dns.removeVipZone(domain)!;
      collection = VIP_DNS_COLLECTION;
    } else {
      base = dns.removeTonZone(domain);
      collection = TON_DNS_COLLECTION;
    }

    const result = await dnsResolve(
      getTonClient(network),
      collection,
      base,
      DnsCategory.Wallet,
    );

    if (!(result instanceof Address)) {
      return undefined;
    }

    return toBase64Address(result, undefined, network);
  } catch (err: any) {
    if (!err.message?.includes('exit_code')) {
      throw err;
    }
    return undefined;
  }
}

export function normalizeAddress(address: string, network?: ApiNetwork) {
  return toBase64Address(address, true, network);
}
