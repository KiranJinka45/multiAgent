package ztan.lattice

default allow = false

allow {
    has_lattice
    check_approval
    check_tenant
    check_network
    check_filesystem
}

has_lattice {
    input.lattice != null
}

# Approval
check_approval {
    not input.isIrreversible
}
check_approval {
    input.isIrreversible
    input.lattice.approvalRequirement == true
}

# Tenant
check_tenant {
    count(input.lattice.tenantScope) == 0
}
check_tenant {
    "*" == input.lattice.tenantScope[_]
}
check_tenant {
    input.tenantId == input.lattice.tenantScope[_]
}

# Network
check_network {
    not input.networkHost
}
check_network {
    input.networkHost
    not is_loopback(input.networkHost)
    is_network_allowed(input.networkHost, input.lattice.networkScope)
}

is_loopback(host) {
    host_part := split(lower(trim_space(host)), ":")[0]
    loopbacks := {"localhost", "::1", "0.0.0.0"}
    loopbacks[host_part]
}
is_loopback(host) {
    host_part := split(lower(trim_space(host)), ":")[0]
    startswith(host_part, "127.")
}

is_network_allowed(host, scope) {
    count(scope) > 0
    "*" == scope[_]
}
is_network_allowed(host, scope) {
    count(scope) > 0
    host == scope[_]
}

# Filesystem
check_filesystem {
    not input.filePath
}
check_filesystem {
    input.filePath
    is_fs_allowed(input.filePath, input.lattice.filesystemScope)
}

is_fs_allowed(path, scope) {
    "*" == scope[_]
}
is_fs_allowed(path, scope) {
    startswith(path, scope[_])
}
