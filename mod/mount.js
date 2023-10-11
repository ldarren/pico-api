/*
 *Mount service schamas and script on host machine. this module only work on linux os as most of the OS don't support these container technologies
 *- chroot: fs partition (bsd, mac supported)
 *- cgroups: limit resource usgae
 *- namespaces: process and network partition
 *- overlayfs: overlay file system
 *
 *for other os, virtualization such as xhyve is needed to create a linux host and ssh command to the services runs in linux host
 *
 *REF
 * // https://blog.programster.org/overlayfs
 * // https://apple.stackexchange.com/a/362030
 * // https://github.com/maxogden/linux
 * // https://github.com/davidmarkclements/nodux
 */
